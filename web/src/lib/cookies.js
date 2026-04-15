export const getCookie = (name, cookies) => {
  const cookie = cookies?.get(name)
  return cookie?.value || null
}

export const setCookie = (response, name, value, options = {}) => {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    ...options,
  })
  return response
}

export const clearCookie = (response, name) => {
  response.cookies.delete(name)
  return response
}
