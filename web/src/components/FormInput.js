'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function FormInput({
  label,
  type = 'text',
  placeholder,
  error,
  success,
  icon: Icon,
  helperText,
  required,
  disabled,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const getBorderColor = () => {
    if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-100'
    if (success) return 'border-green-300 focus:border-green-500 focus:ring-green-100'
    if (focused) return 'border-gray-400 focus:border-gray-500 focus:ring-gray-100'
    return 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Left Icon */}
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon className={`w-4 h-4 ${error ? 'text-red-400' : 'text-gray-400'}`} />
          </div>
        )}

        {/* Input Field */}
        <input
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full px-4 py-2.5 border rounded-lg text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error ? 'pr-10' : ''}
            ${success ? 'pr-10' : ''}
            ${getBorderColor()}
            ${className}
          `}
          {...props}
        />

        {/* Right side elements */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Password Toggle */}
          {isPassword && !disabled && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {/* Validation Icons */}
          {error && <AlertCircle className="w-4 h-4 text-red-500" />}
          {success && !error && <CheckCircle className="w-4 h-4 text-green-500" />}
        </div>
      </div>

      {/* Helper Text & Error Message */}
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}