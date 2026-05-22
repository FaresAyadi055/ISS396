'use client'

import { Search } from 'lucide-react'

/**
 * Search field: icon on the right when empty; fully hidden when the user has
 * typed (no overlap with text or placeholder). Padding tightens when hidden.
 */
export default function SearchInput({
  className = '',
  inputClassName = '',
  iconWrapperClassName = '',
  rounded = 'lg',
  ...props
}) {
  const roundedClass = rounded === 'xl' ? 'rounded-xl' : 'rounded-lg'

  return (
    <div
      className={`relative min-w-0 [&:has(>input:not(:placeholder-shown))>input]:pr-4 [&:has(>input:not(:placeholder-shown))_.search-trail-icon]:hidden ${className}`}
    >
      <input
        {...props}
        className={`w-full border-2 border-outline bg-gray-50 py-2.5 pl-4 pr-11 text-sm leading-normal text-ink shadow-none transition-[padding] duration-200 placeholder:text-ink-tertiary/85 placeholder:leading-normal focus:border-brand focus:outline-none focus:ring-4 focus:ring-emerald-100/80 disabled:cursor-not-allowed disabled:bg-gray-100 ${roundedClass} ${inputClassName}`}
      />
      <span
        className={`search-trail-icon pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-tertiary ${iconWrapperClassName}`}
        aria-hidden
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
      </span>
    </div>
  )
}
