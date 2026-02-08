'use client'

export default function FormInput({
  label,
  type = 'text',
  placeholder,
  error,
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-black mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black transition ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
