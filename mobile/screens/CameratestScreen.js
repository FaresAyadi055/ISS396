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
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const API_URL           = process.env.EXPO_PUBLIC_API_URL ?? '';
const SOCKET_ORIGIN     = API_URL.replace(/\/api$/, '');
const SOCKET_PATH       = '/api/ai_pipeline/socket';
const ROOM_ID           = 'room-1';
const FRAME_INTERVAL_MS = 100;  // 10 fps
const JPEG_QUALITY      = 35;

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

export default function CameraTestScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing]         = useState('back');
  const [flashMode, setFlashMode]   = useState('off');
  const [zoom, setZoom]             = useState(0);
  const [isCamReady, setIsCamReady] = useState(false);

  const device  = useCameraDevice(facing);
  const insets   = useSafeAreaInsets();

  const [status, setStatus]           = useState(STATUS.IDLE);
  const [role, setRole]               = useState(null);
  const [fps, setFps]                 = useState(0);
  const [errorMsg, setErrorMsg]       = useState('');

  // FPS calculation refs
  const frameTimestampsRef = useRef([]);
  const fpsUpdateIntervalRef = useRef(null);

  // Double-buffer: two Images always mounted, swap only after onLoad fires.
  // frontRef is a ref (not state) so frame arrivals always read the current
  // value synchronously — this prevents writing into the visible slot.
  const [uriA, setUriA]   = useState(null);
  const [uriB, setUriB]   = useState(null);
  const [front, setFront] = useState('A');
  const frontRef          = useRef('A');    // sync mirror of front for frame handler
  const hasFrame          = uriA !== null || uriB !== null;

  const cameraRef      = useRef(null);
  const socketRef      = useRef(null);
  const captureLoop    = useRef(null);
  const mountedRef     = useRef(true);
  const isStreamingRef = useRef(false);

  // ── FPS Calculation ───────────────────────────────────────────────────────────
  const updateFPS = useCallback(() => {
    const now = Date.now();
    const timestamps = frameTimestampsRef.current;
    
    // Remove timestamps older than 1 second
    while (timestamps.length > 0 && timestamps[0] < now - 1000) {
      timestamps.shift();
    }
    
    // FPS is the number of frames in the last second
    setFps(timestamps.length);
  }, []);

  const addFrameTimestamp = useCallback(() => {
    frameTimestampsRef.current.push(Date.now());
    updateFPS();
  }, [updateFPS]);

  // Start/stop FPS updater interval
  useEffect(() => {
    if (status === STATUS.STREAMING) {
      fpsUpdateIntervalRef.current = setInterval(updateFPS, 200);
    } else {
      if (fpsUpdateIntervalRef.current) {
        clearInterval(fpsUpdateIntervalRef.current);
        fpsUpdateIntervalRef.current = null;
      }
      setFps(0);
      frameTimestampsRef.current = [];
    }
    
    return () => {
      if (fpsUpdateIntervalRef.current) {
        clearInterval(fpsUpdateIntervalRef.current);
      }
    };
  }, [status, updateFPS]);

  // ── Animations ──────────────────────────────────────────────────────────────
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

  // ── Capture loop ─────────────────────────────────────────────────────────────
  // Self-scheduling instead of setInterval: schedules the next capture only
  // after the current one completes — prevents frame pile-up in the JS queue.
  // isSendingRef drops the tick entirely if the previous one is still in flight,
  // ensuring we never build a backlog regardless of network/processing speed.
  const isSendingRef = useRef(false);

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

          const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
          // Delete in background — don't block the emit
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});

          if (base64) socket.emit('video-frame', { roomId: ROOM_ID, frame: base64 });

        } catch (err) {
          console.warn('[capture] failed:', err?.message ?? err);
        } finally {
          isSendingRef.current = false;
        }
      }

      // Schedule next tick regardless — maintains the target fps ceiling
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

  // ── Socket.IO ────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setStatus(STATUS.CONNECTING);
    setErrorMsg('');
    setFps(0);
    frameTimestampsRef.current = [];
    // Do NOT clear displayFrame — keep last frame visible during reconnect

    try { await fetch(`${API_URL}/ai_pipeline/socket`); } catch { /* non-fatal */ }

    const socket = io(SOCKET_ORIGIN, {
      path:         SOCKET_PATH,
      transports:   ['websocket'],
      reconnection: false,
      timeout:      20000,
    });

    socket.on('connect', () => {
      if (!mountedRef.current) return;
      console.log('[socket] connected, joining room:', ROOM_ID);
      socket.emit('join-room', { roomId: ROOM_ID });
    });

    socket.on('connect_error', (err) => {
      if (!mountedRef.current) return;
      console.error('[socket] connect_error:', err.message);
      setStatus(STATUS.ERROR);
      setErrorMsg(`Cannot reach server:\n${API_URL}`);
    });

    socket.on('disconnect', (reason) => {
      if (!mountedRef.current) return;
      console.log('[socket] disconnected:', reason);
      isStreamingRef.current = false;
      stopCaptureLoop();
      setStatus(STATUS.IDLE);
    });

    socket.on('role-assigned', ({ role: r }) => {
      if (!mountedRef.current) return;
      console.log('[socket] role:', r);
      setRole(r);
      setStatus(STATUS.WAITING);
    });

    socket.on('room-full', () => {
      if (!mountedRef.current) return;
      setStatus(STATUS.ERROR);
      setErrorMsg('Room is full. Try a different ROOM_ID.');
    });

    socket.on('peer-joined', () => {
      if (!mountedRef.current) return;
      console.log('[socket] peer joined — starting stream');
      setStatus(STATUS.STREAMING);
      isStreamingRef.current = true;
      startCaptureLoop();
    });

    socket.on('peer-left', () => {
      if (!mountedRef.current) return;
      isStreamingRef.current = false;
      stopCaptureLoop();
      setStatus(STATUS.WAITING);
      // Keep displayFrame — no black screen while waiting for peer to rejoin
    });

    socket.on('processed-frame', ({ frame }) => {
      if (!mountedRef.current) return;
      
      // Add timestamp for FPS calculation
      addFrameTimestamp();
      
      const uri = `data:image/jpeg;base64,${frame}`;
      // Always write into whichever slot is currently NOT front.
      // frontRef is a ref so this read is always current, even if multiple
      // frames arrive before React re-renders — we never touch the visible slot.
      const back = frontRef.current === 'A' ? 'B' : 'A';
      if (back === 'A') setUriA(uri);
      else              setUriB(uri);
    });

    socketRef.current = socket;
  }, [startCaptureLoop, stopCaptureLoop, addFrameTimestamp]);

  const disconnect = useCallback(() => {
    isStreamingRef.current = false;
    stopCaptureLoop();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus(STATUS.IDLE);
    setUriA(null);
    setUriB(null);
    setFront('A');
    frontRef.current = 'A';
    setFps(0);
    frameTimestampsRef.current = [];
    setRole(null);
  }, [stopCaptureLoop]);

  useEffect(() => {
    return () => {
      isStreamingRef.current = false;
      stopCaptureLoop();
      socketRef.current?.disconnect();
    };
  }, []);

  // ── Camera controls ──────────────────────────────────────────────────────────
  const toggleFacing = () => setFacing((p) => (p === 'back' ? 'front' : 'back'));
  const cycleFlash   = () => setFlashMode((p) => p === 'off' ? 'on' : p === 'on' ? 'auto' : 'off');
  const adjustZoom   = (d) => setZoom((p) => Math.min(1, Math.max(0, parseFloat((p + d).toFixed(1)))));

  const flashIcon   = flashMode === 'off' ? '⚡' : flashMode === 'on' ? '🔦' : '⚙️';
  const isActive    = status !== STATUS.IDLE && status !== STATUS.ERROR;
  const statusColor = STATUS_COLOR[status] ?? 'white';

  // ── Permission / device guards ───────────────────────────────────────────────
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

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Placeholder — only shown before any frame has arrived */}
      {!hasFrame && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>
            {status === STATUS.ERROR ? '⚠️' : '📡'}
          </Text>
          <Text style={styles.placeholderTitle}>
            {status === STATUS.IDLE       && 'Press Connect to start'}
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
      {/* Slot A — hidden while loading; onLoad promotes it to front only if
           it is currently the back slot, guaranteeing the visible slot
           never has its source changed mid-display. */}
      {uriA && (
        <Image
          source={{ uri: uriA }}
          style={[styles.frameLayer, { opacity: front === 'A' ? 1 : 0 }]}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => {
            if (frontRef.current === 'B') {
              frontRef.current = 'A';
              setFront('A');
            }
          }}
        />
      )}
      {/* Slot B — same contract as slot A */}
      {uriB && (
        <Image
          source={{ uri: uriB }}
          style={[styles.frameLayer, { opacity: front === 'B' ? 1 : 0 }]}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => {
            if (frontRef.current === 'A') {
              frontRef.current = 'B';
              setFront('B');
            }
          }}
        />
      )}

      {/* Hidden camera — full-size for sharp snapshots, invisible to user */}
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
          {fps > 0 && <Text style={styles.fpsLabel}>{fps.toFixed(1)} fps</Text>}
          {role && <Text style={styles.roleLabel}>{role}</Text>}
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={cycleFlash}>
          <Text style={styles.ctrlIcon}>{flashIcon}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, zoom <= 0 && styles.ctrlBtnDisabled]}
          onPress={() => adjustZoom(-0.1)}
          disabled={zoom <= 0}
        >
          <Text style={styles.ctrlIcon}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtnMain, isActive ? styles.ctrlBtnDanger : styles.ctrlBtnPrimary]}
          onPress={isActive ? disconnect : connect}
          disabled={!isCamReady}
        >
          <Text style={styles.ctrlBtnMainIcon}>{isActive ? '⏹' : '📡'}</Text>
          <Text style={styles.ctrlBtnMainLabel}>{isActive ? 'Stop' : 'Connect'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, zoom >= 1 && styles.ctrlBtnDisabled]}
          onPress={() => adjustZoom(0.1)}
          disabled={zoom >= 1}
        >
          <Text style={styles.ctrlIcon}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlBtn} onPress={toggleFacing}>
          <Text style={styles.ctrlIcon}>🔄</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

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

  controls:        { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
                     flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
                     paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  ctrlBtn:         { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
                     backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ctrlBtnDisabled: { opacity: 0.3 },
  ctrlIcon:        { fontSize: 20, color: '#fff' },

  ctrlBtnMain:      { paddingHorizontal: 28, height: 52, borderRadius: 26,
                      justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  ctrlBtnPrimary:   { backgroundColor: '#00ff88' },
  ctrlBtnDanger:    { backgroundColor: '#ff4d4d' },
  ctrlBtnMainIcon:  { fontSize: 18 },
  ctrlBtnMainLabel: { color: '#000', fontWeight: '800', fontSize: 14 },
});