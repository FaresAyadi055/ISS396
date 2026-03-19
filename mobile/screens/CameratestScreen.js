import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const API_URL       = process.env.EXPO_PUBLIC_API_URL ?? '';

const SOCKET_ORIGIN = API_URL.replace(/\/api$/, '');
const SOCKET_PATH   = '/api/ai_pipeline/socket';
const ROOM_ID       = 'room-1';

const FRAME_INTERVAL_MS = 80;
const JPEG_QUALITY      = 35;

// ─────────────────────────────────────────────────────────────────────────────
// No hardcoded label list needed.
// FastAPI zips labels with scores at inference time and sends
//   classification_results.classifications: [{label, score}, ...]
// sorted descending — classifications[0] is always the top prediction.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS = {
  IDLE:       'IDLE',
  CONNECTING: 'CONNECTING',
  WAITING:    'WAITING',
  STREAMING:  'STREAMING',
  ERROR:      'ERROR',
};

const STATUS_COLOR = {
  [STATUS.IDLE]:       'rgba(255,255,255,0.3)',
  [STATUS.CONNECTING]: '#ffcc00',
  [STATUS.WAITING]:    '#ffcc00',
  [STATUS.STREAMING]:  '#00ff88',
  [STATUS.ERROR]:      '#ff4d4d',
};

export default function CameraTestScreen({ navigation }) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing]         = useState('back');
  const [flashMode, setFlashMode]   = useState('off');
  const [zoom, setZoom]             = useState(0);
  const [isCamReady, setIsCamReady] = useState(false);

  const device = useCameraDevice(facing);
  const insets = useSafeAreaInsets();

  const [status, setStatus]     = useState(STATUS.IDLE);
  const [role, setRole]         = useState(null);
  const [fps, setFps]           = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Scan state ────────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing]   = useState(false);  // POST in-flight
  const [modalVisible, setModalVisible] = useState(false);  // result modal
  const [scanResult, setScanResult]     = useState(null);   // last POST response

  // persists the MongoDB session id across multiple analyzes in one session
  const sessionMongoIdRef = useRef(null);

  // last raw base64 frame captured (for the Analyze POST)
  const lastRawFrameRef = useRef(null);

  // last processed frame URI from socket (shown in the result modal)
  const lastProcessedUriRef = useRef(null);
  const [lastProcessedUri, setLastProcessedUri] = useState(null);

  // ── FPS tracking ──────────────────────────────────────────────────────────
  const fpsWindowRef   = useRef([]);
  const fpsIntervalRef = useRef(null);

  // ── Double-buffer display ─────────────────────────────────────────────────
  const [uriA, setUriA] = useState(null);
  const [uriB, setUriB] = useState(null);
  const [front, setFront] = useState('A');
  const frontRef = useRef('A');
  const hasFrame = uriA !== null || uriB !== null;

  const cameraRef      = useRef(null);
  const socketRef      = useRef(null);
  const captureLoop    = useRef(null);
  const mountedRef     = useRef(true);
  const isStreamingRef = useRef(false);
  const isSendingRef   = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────
  // FPS
  // ─────────────────────────────────────────────────────────────────────────
  const recordReceivedFrame = useCallback(() => {
    fpsWindowRef.current.push(Date.now());
  }, []);

  useEffect(() => {
    if (status === STATUS.STREAMING) {
      fpsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        fpsWindowRef.current = fpsWindowRef.current.filter(t => t > now - 1000);
        setFps(fpsWindowRef.current.length);
      }, 250);
    } else {
      clearInterval(fpsIntervalRef.current);
      fpsWindowRef.current = [];
      setFps(0);
    }
    return () => clearInterval(fpsIntervalRef.current);
  }, [status]);

  // ─────────────────────────────────────────────────────────────────────────
  // Animations
  // ─────────────────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (status === STATUS.STREAMING) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [status]);

  // ─────────────────────────────────────────────────────────────────────────
  // Capture loop  —  stores the last raw frame for Analyze
  // ─────────────────────────────────────────────────────────────────────────
  const startCaptureLoop = useCallback(() => {
    if (captureLoop.current) return;

    const tick = async () => {
      if (!isStreamingRef.current) return;

      const socket = socketRef.current;

      if (!isSendingRef.current && cameraRef.current && socket?.connected) {
        isSendingRef.current = true;
        try {
          const snapshot = await cameraRef.current.takeSnapshot({
            quality:      JPEG_QUALITY,
            skipMetadata: true,
          });

          const fileUri = snapshot.path.startsWith('file://')
            ? snapshot.path
            : `file://${snapshot.path}`;

          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});

          if (base64 && socket.connected) {
            // ── Always keep the freshest raw frame for the Analyze action ──
            lastRawFrameRef.current = base64;
            socket.emit('video-frame', { roomId: ROOM_ID, frame: base64 });
          }
        } catch (err) {
          console.warn('[capture] failed:', err?.message ?? err);
        } finally {
          isSendingRef.current = false;
        }
      }

      if (isStreamingRef.current) {
        captureLoop.current = setTimeout(tick, FRAME_INTERVAL_MS);
      }
    };

    captureLoop.current = setTimeout(tick, 0);
  }, []);

  const stopCaptureLoop = useCallback(() => {
    if (captureLoop.current) {
      clearTimeout(captureLoop.current);
      captureLoop.current = null;
    }
    isSendingRef.current = false;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Socket.IO
  // ─────────────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (socketRef.current) return;

    setStatus(STATUS.CONNECTING);
    setErrorMsg('');

    try {
      await fetch(`${API_URL}/ai_pipeline/socket`);
    } catch {
      // Non-fatal
    }

    const socket = io(SOCKET_ORIGIN, {
      path:        SOCKET_PATH,
      transports:  ['websocket'],
      timeout:     10_000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay:    1_000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id);
      socket.emit('join-room', { roomId: ROOM_ID });
    });

    socket.on('role-assigned', ({ role: r }) => {
      setRole(r);
      setStatus(STATUS.WAITING);
    });

    socket.on('peer-joined', () => {
      isStreamingRef.current = true;
      setStatus(STATUS.STREAMING);
      startCaptureLoop();
    });

    // ── Processed frame handler — also tracks last processed URI ─────────
    socket.on('processed-frame', ({ frame }) => {
      if (!mountedRef.current) return;
      recordReceivedFrame();

      const dataUri = `data:image/jpeg;base64,${frame}`;

      // Keep reference for the modal
      lastProcessedUriRef.current = dataUri;
      setLastProcessedUri(dataUri);

      // Double-buffer swap
      if (frontRef.current === 'A') {
        setUriB(dataUri);
      } else {
        setUriA(dataUri);
      }
    });

    socket.on('room-full', () => {
      setStatus(STATUS.ERROR);
      setErrorMsg('Room is full — try a different room ID.');
      socket.disconnect();
    });

    socket.on('peer-left', () => {
      isStreamingRef.current = false;
      stopCaptureLoop();
      setStatus(STATUS.WAITING);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
      setStatus(STATUS.ERROR);
      setErrorMsg(err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnect:', reason);
      isStreamingRef.current = false;
      stopCaptureLoop();
      if (mountedRef.current && status !== STATUS.ERROR) {
        setStatus(STATUS.IDLE);
      }
    });
  }, [startCaptureLoop, stopCaptureLoop, recordReceivedFrame, status]);

  const disconnect = useCallback(() => {
    isStreamingRef.current = false;
    stopCaptureLoop();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus(STATUS.IDLE);
    setRole(null);
    setUriA(null);
    setUriB(null);
    frontRef.current = 'A';
    setFront('A');
    lastRawFrameRef.current   = null;
    lastProcessedUriRef.current = null;
    setLastProcessedUri(null);
    sessionMongoIdRef.current = null;
  }, [stopCaptureLoop]);

  useEffect(() => () => { disconnect(); }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Analyze  —  POST last raw frame to Next.js → FastAPI → MongoDB
  // ─────────────────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    const rawFrame = lastRawFrameRef.current;
    if (!rawFrame) return;
    if (isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      // Write base64 to a temp file so FormData receives a proper file URI
      const tempUri = `${FileSystem.cacheDirectory}scan_frame_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(tempUri, rawFrame, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const form = new FormData();
      form.append('file', {
        uri:  tempUri,
        type: 'image/jpeg',
        name: 'frame.jpg',
      });

      // Reuse the existing MongoDB session so scans accumulate
      if (sessionMongoIdRef.current) {
        form.append('sessionId', sessionMongoIdRef.current);
      }

      const res = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        body:   form,
        // Do NOT set Content-Type — let RN set multipart boundary
      });

      // Cleanup temp file in background
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`Scan failed (${res.status}): ${txt}`);
      }

      const data = await res.json();

      // Persist session id for subsequent analyzes
      if (data.sessionMongoId) {
        sessionMongoIdRef.current = data.sessionMongoId;
      }

      // Snapshot the last processed frame at time of analysis
      const frozenProcessedUri = lastProcessedUriRef.current;

      setScanResult({ ...data, processedFrameUri: frozenProcessedUri });
      setModalVisible(true);

    } catch (err) {
      console.error('[analyze] error:', err.message);
      setErrorMsg(err.message);
      setStatus(STATUS.ERROR);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cancel  —  clear FastAPI store + disconnect + reset
  // ─────────────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(async () => {
    // Fire-and-forget: tell Next.js to wipe both FastAPI store and MongoDB session
    fetch(`${API_URL}/scan`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(
        sessionMongoIdRef.current
          ? { sessionId: sessionMongoIdRef.current }
          : {}
      ),
    }).catch(err => console.warn('[cancel] DELETE failed:', err.message));

    disconnect();
  }, [disconnect]);

  // ─────────────────────────────────────────────────────────────────────────
  // Modal actions
  // ─────────────────────────────────────────────────────────────────────────

  // "Continue" — clear FastAPI store, keep socket alive, ready for next analyze
  const handleContinue = useCallback(async () => {
    setModalVisible(false);
    setScanResult(null);

    // Clear FastAPI in-memory store (MongoDB session is kept for accumulation)
    fetch(`${API_URL}/scan`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),  // no sessionId → only clears FastAPI store
    }).catch(err => console.warn('[continue] DELETE failed:', err.message));
  }, []);

  // "Finish" — clear everything, go to Dashboard
  const handleFinish = useCallback(async () => {
    setModalVisible(false);
    setScanResult(null);

    fetch(`${API_URL}/scan`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(
        sessionMongoIdRef.current
          ? { sessionId: sessionMongoIdRef.current }
          : {}
      ),
    }).catch(err => console.warn('[finish] DELETE failed:', err.message));

    disconnect();
    navigation.navigate('Dashboard');
  }, [disconnect, navigation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────────────────────────────────────
  const cycleFlash = () =>
    setFlashMode(m => m === 'off' ? 'on' : m === 'on' ? 'auto' : 'off');

  const flashIcon   = flashMode === 'off' ? '⚡' : flashMode === 'on' ? '🔦' : '⚙️';
  const isActive    = status !== STATUS.IDLE && status !== STATUS.ERROR;
  const canAnalyze  = status === STATUS.STREAMING && !isAnalyzing;
  const statusColor = STATUS_COLOR[status] ?? 'white';

  // ─────────────────────────────────────────────────────────────────────────
  // Permission / device guards
  // ─────────────────────────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSubtitle}>Grant permission to use the camera.</Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.statusText}>No camera device found</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Placeholder */}
      {!hasFrame && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>
            {status === STATUS.ERROR ? '⚠️' : '📡'}
          </Text>
          <Text style={styles.placeholderTitle}>
            {status === STATUS.IDLE       && 'Press Start Scan to begin'}
            {status === STATUS.CONNECTING && 'Connecting to server…'}
            {status === STATUS.WAITING    && `Waiting for peer…\n(room: ${ROOM_ID})`}
            {status === STATUS.STREAMING  && 'Waiting for first frame…'}
            {status === STATUS.ERROR      && errorMsg}
          </Text>
          {(status === STATUS.CONNECTING || status === STATUS.WAITING) && (
            <Text style={styles.placeholderSub}>{API_URL}</Text>
          )}
        </View>
      )}

      {/* Double-buffer frame layers */}
      {uriA && (
        <Image
          source={{ uri: uriA }}
          style={[styles.frameLayer, { opacity: front === 'A' ? 1 : 0 }]}
          resizeMode="stretch"
          fadeDuration={0}
          onLoad={() => {
            if (frontRef.current === 'B') { frontRef.current = 'A'; setFront('A'); }
          }}
        />
      )}
      {uriB && (
        <Image
          source={{ uri: uriB }}
          style={[styles.frameLayer, { opacity: front === 'B' ? 1 : 0 }]}
          resizeMode="stretch"
          fadeDuration={0}
          onLoad={() => {
            if (frontRef.current === 'A') { frontRef.current = 'B'; setFront('B'); }
          }}
        />
      )}

      {/* Hidden camera */}
      <Camera
        ref={cameraRef}
        style={styles.hiddenCamera}
        device={device}
        isActive={true}
        photo={true}
        zoom={zoom}
        torch={flashMode === 'on' ? 'on' : 'off'}
        onInitialized={() => setIsCamReady(true)}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Animated.View style={[
            styles.statusDot,
            { backgroundColor: statusColor, transform: [{ scale: status === STATUS.STREAMING ? pulseAnim : 1 }] },
          ]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{status}</Text>
        </View>
        <View style={styles.topBarRight}>
          {fps > 0 && <Text style={styles.fpsLabel}>{fps} fps</Text>}
          {role && <Text style={styles.roleLabel}>{role}</Text>}
        </View>
      </View>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>

        {/* Flash toggle — always visible */}
        <TouchableOpacity style={styles.ctrlBtn} onPress={cycleFlash}>
          <Text style={styles.ctrlIcon}>{flashIcon}</Text>
        </TouchableOpacity>

        {/* ── IDLE / ERROR: Start Scan ─────────────────────────────────── */}
        {!isActive && (
          <TouchableOpacity
            style={[styles.ctrlBtnMain, styles.ctrlBtnPrimary]}
            onPress={connect}
            disabled={!isCamReady}
          >
            <Text style={styles.ctrlBtnMainIcon}>📡</Text>
            <Text style={styles.ctrlBtnMainLabel}>Start Scan</Text>
          </TouchableOpacity>
        )}

        {/* ── ACTIVE: Analyze + Cancel ─────────────────────────────────── */}
        {isActive && (
          <View style={styles.scanActionRow}>
            {/* Analyze */}
            <TouchableOpacity
              style={[
                styles.ctrlBtnMain,
                styles.ctrlBtnPrimary,
                (!canAnalyze) && styles.ctrlBtnDisabled,
              ]}
              onPress={handleAnalyze}
              disabled={!canAnalyze}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Text style={styles.ctrlBtnMainIcon}>🔬</Text>
                  <Text style={styles.ctrlBtnMainLabel}>Analyze</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.ctrlBtnMain, styles.ctrlBtnDanger]}
              onPress={handleCancel}
              disabled={isAnalyzing}
            >
              <Text style={styles.ctrlBtnMainIcon}>✕</Text>
              <Text style={[styles.ctrlBtnMainLabel, { color: '#fff' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Back arrow — only when idle */}
        {!isActive && (
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.gobackIcon}>↩️</Text>
          </TouchableOpacity>
        )}

        {/* Spacer to keep layout balanced when back arrow is hidden */}
        {isActive && <View style={styles.ctrlPlaceholder} />}
      </View>

      {/* ── Result Modal ─────────────────────────────────────────────────── */}
      <Modal
  visible={modalVisible}
  transparent
  animationType="slide"
  statusBarTranslucent
  onRequestClose={() => {}}
>
  <View style={styles.modalOverlay}>
    <View style={[
      styles.modalCard,
      { paddingBottom: Math.max(36, insets.bottom + 20) }
    ]}>
      
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Scan Complete</Text>
        <Text style={styles.modalSubtitle}>
          {scanResult?.detections_count ?? 0} object
          {(scanResult?.detections_count ?? 0) !== 1 ? 's' : ''} detected
        </Text>
      </View>

      {/* Last processed frame from socket */}
      {scanResult?.processedFrameUri ? (
        <View style={styles.processedFrameWrapper}>
          <Text style={styles.sectionLabel}>Processed Frame</Text>
          <Image
            source={{ uri: scanResult.processedFrameUri }}
            style={styles.processedFrameImg}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {/* Detection results — scrollable list of mask crops */}
      {scanResult?.image?.length > 0 && (
        <View style={styles.detectionsWrapper}>
          <Text style={styles.sectionLabel}>Detections Preview</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.detectionScroll}
          >
            {scanResult.image.map((det, idx) => (
              <View key={idx} style={styles.detectionCard}>
                {/* Mask crop stored as base64-PNG */}
                <Image
                  source={{ uri: `data:image/png;base64,${det.mask}` }}
                  style={styles.maskImg}
                  resizeMode="contain"
                />
                <View style={styles.detectionInfo}>
                  {/* Top prediction — classifications[0] is pre-sorted desc by FastAPI */}
                  {(() => {
                    const top = det.classification_results?.classifications?.[0];
                    return top ? (
                      <>
                        <Text style={styles.detectionLabel} numberOfLines={2}>
                          {top.label.replace(/___/g, ' — ').replace(/_/g, ' ')}
                        </Text>
                        <Text style={styles.detectionConf}>
                          {(top.score * 100).toFixed(1)}%
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.detectionLabel}>Unknown</Text>
                    );
                  })()}


                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* No detections fallback */}
      {(scanResult?.detections_count ?? 0) === 0 && (
        <View style={styles.noDetection}>
          <Text style={styles.noDetectionIcon}>🌿</Text>
          <Text style={styles.noDetectionText}>
            No objects detected above the confidence threshold.
            Try repositioning the camera.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalBtn, styles.modalBtnSecondary]}
          onPress={handleContinue}
        >
          <Text style={styles.modalBtnSecondaryText}>Continue Scanning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalBtn, styles.modalBtnPrimary]}
          onPress={handleFinish}
        >
          <Text style={styles.modalBtnPrimaryText}>Finish</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>

    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#000' },
  centeredContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 32 },
  statusText:        { color: 'rgba(255,255,255,0.5)', fontSize: 15, letterSpacing: 1 },
  permIcon:          { fontSize: 52, marginBottom: 16 },
  permTitle:         { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  permSubtitle:      { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  grantBtn:          { backgroundColor: '#00ff88', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14 },
  grantBtnText:      { color: '#000', fontWeight: '800', fontSize: 15 },

  placeholder:      { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 32 },
  placeholderIcon:  { fontSize: 52, marginBottom: 16 },
  placeholderTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24 },
  placeholderSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 10, textAlign: 'center' },

  frameLayer:   { ...StyleSheet.absoluteFillObject },
  hiddenCamera: { ...StyleSheet.absoluteFillObject, opacity: 0 },

  topBar:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
                 paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 12,
                 flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 backgroundColor: 'rgba(0,0,0,0.4)' },
  topBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  fpsLabel:    { color: '#00ff88', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  roleLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // ── Bottom controls ──────────────────────────────────────────────────────
  controls:          { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
                       flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
                       paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.55)' },
  ctrlBtn:           { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
                       backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ctrlIcon:          { fontSize: 20, color: '#fff' },
  gobackIcon:        { fontSize: 30, color: '#fff' },
  ctrlPlaceholder:   { width: 48 },  // mirrors gobackIcon width to keep layout balanced
  ctrlBtnDisabled:   { opacity: 0.35 },

  ctrlBtnMain:      { paddingHorizontal: 22, height: 52, borderRadius: 26,
                      justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
                      minWidth: 120 },
  ctrlBtnPrimary:   { backgroundColor: '#00ff88' },
  ctrlBtnDanger:    { backgroundColor: '#ff4d4d' },
  ctrlBtnMainIcon:  { fontSize: 16 },
  ctrlBtnMainLabel: { color: '#000', fontWeight: '800', fontSize: 13 },

  // Analyze + Cancel sit side-by-side
  scanActionRow:    { flexDirection: 'row', gap: 10, alignItems: 'center' },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  processedFrameWrapper: {
    marginBottom: 18,
  },
  processedFrameImg: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#000',
  },

  detectionsWrapper: {
    marginBottom: 18,
  },
  detectionScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  detectionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    overflow: 'hidden',
    width: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  maskImg: {
    width: 200,
    height: 150,
    backgroundColor: '#000',
  },
  detectionInfo: {
    padding: 10,
  },
  detectionLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    lineHeight: 15,
  },
  detectionConf: {
    color: '#00ff88',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  scoresScroll: {
    maxHeight: 180,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    flex: 1,
  },
  scoreBarTrack: {
    width: 50,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 4,
    backgroundColor: '#00ff88',
    borderRadius: 2,
  },
  scoreValue: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    width: 32,
    textAlign: 'right',
  },

  noDetection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  noDetectionIcon: { fontSize: 36, marginBottom: 10 },
  noDetectionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnPrimary:       { backgroundColor: '#00ff88' },
  modalBtnSecondary:     { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  modalBtnPrimaryText:   { color: '#000', fontWeight: '800', fontSize: 15 },
  modalBtnSecondaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});