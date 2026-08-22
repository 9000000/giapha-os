'use client'

import config from '@/app/config'
import Footer from '@/components/Footer'
import { createClient } from '@/utils/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Info, KeyRound, Mail, Shield, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === config.demoDomain) {
        setIsDemo(true)
        setEmail('giaphaos@homielab.com')
        setPassword('giaphaos')
      }
    }
  }, [])

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [isLogin, setIsLogin] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          setError(error.message)
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp.')
          setLoading(false)
          return
        }

        // 1. Try to sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        })

        if (error) {
          // Check if error is related to missing database schema/tables
          if (
            error.message.includes('relation') &&
            error.message.includes('does not exist')
          ) {
            router.push('/setup')
            return
          }

          setError(error.message)
        } else if (data.user?.identities && data.user.identities.length === 0) {
          setError(
            'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.'
          )
        } else {
          if (data.session) {
            router.push('/dashboard')
            router.refresh()
          } else {
            // Attempt to sign in immediately (catches auto-confirmed first admin)
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({
                email,
                password
              })

            if (!signInError && signInData.session) {
              router.push('/dashboard')
              router.refresh()
            } else {
              setSuccessMessage(
                'Đăng ký thành công! Vui lòng chờ admin kích hoạt tài khoản để xem nội dung.'
              )
              setIsLogin(true) // Switch back to login view
              setConfirmPassword('') // clear confirm password
              setPassword('') // clear password
            }
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='relative flex min-h-screen flex-col overflow-hidden bg-[#fafaf9] select-none selection:bg-amber-200 selection:text-amber-900'>
      {/* Decorative background grid and blurs */}
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px]'></div>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#fef3c7,transparent)]'></div>

      <div className='pointer-events-none absolute inset-x-0 top-0 flex h-screen justify-center overflow-hidden'>
        <div className='absolute top-[-10%] right-[-5%] h-[50vw] max-h-[600px] w-[50vw] max-w-[600px] rounded-full bg-amber-300/20 mix-blend-multiply blur-[100px]' />
        <div className='absolute bottom-[0%] left-[-10%] h-[60vw] max-h-[800px] w-[60vw] max-w-[800px] rounded-full bg-rose-200/20 mix-blend-multiply blur-[120px]' />
      </div>

      <div className='relative z-10 flex w-full flex-1 items-center justify-center px-4 py-12'>
        <motion.div
          className='relative w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/70 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl sm:p-10'
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <div className='pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-[100px] bg-linear-to-br from-amber-100/50 to-transparent'></div>

          <div className='relative z-10 mb-8 text-center'>
            <Link
              href='/'
              className='mb-5 inline-flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-100 transition-all duration-300 hover:scale-105 hover:shadow-md'>
              <Shield className='size-8 text-amber-600' />
            </Link>
            <h2 className='font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </h2>
            <p className='mt-3 text-sm font-medium tracking-wide text-stone-500'>
              {isLogin
                ? 'Đăng nhập để truy cập gia phả.'
                : 'Tạo tài khoản thành viên mới.'}
            </p>
            {isDemo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className='mt-4 rounded-xl border border-amber-200/60 bg-amber-50 p-3'>
                <p className='text-[13px] font-semibold text-amber-800'>
                  Website Demo. Dữ liệu đều không có thật.
                </p>
              </motion.div>
            )}
          </div>

          <form className='relative z-10 space-y-5' onSubmit={handleSubmit}>
            <div className='space-y-4'>
              <div className='relative'>
                <label
                  htmlFor='email-address'
                  className='mb-1.5 ml-1 block text-[13px] font-semibold text-stone-600'>
                  Email
                </label>
                <div className='group relative flex items-center'>
                  <Mail className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500' />
                  <input
                    id='email-address'
                    name='email'
                    type='email'
                    autoComplete='email'
                    required
                    className='block w-full rounded-xl border border-stone-200/80 bg-white/50 py-3.5 pr-4 pl-11 text-stone-900 placeholder-stone-400 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] transition-all duration-200 outline-none focus:border-amber-400 focus:bg-white focus:ring-amber-400'
                    placeholder='name@example.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className='relative'>
                <label
                  htmlFor='password'
                  className='mb-1.5 ml-1 block text-[13px] font-semibold text-stone-600'>
                  Mật khẩu
                </label>
                <div className='group relative flex items-center'>
                  <KeyRound className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500' />
                  <input
                    id='password'
                    name='password'
                    type='password'
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    className='block w-full rounded-xl border border-stone-200/80 bg-white/50 py-3.5 pr-4 pl-11 text-stone-900 placeholder-stone-400 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] transition-all duration-200 outline-none focus:border-amber-400 focus:bg-white focus:ring-amber-400'
                    placeholder='Nhập mật khẩu'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3 }}
                    className='relative overflow-hidden'>
                    <label
                      htmlFor='confirmPassword'
                      className='mb-1.5 ml-1 block text-[13px] font-semibold text-stone-600'>
                      Xác nhận mật khẩu
                    </label>
                    <div className='group relative flex items-center'>
                      <KeyRound className='absolute left-3.5 size-5 text-stone-400 transition-colors group-focus-within:text-amber-500' />
                      <input
                        id='confirmPassword'
                        name='confirmPassword'
                        type='password'
                        autoComplete='new-password'
                        required={!isLogin}
                        className='block w-full rounded-xl border border-stone-200/80 bg-white/50 py-3.5 pr-4 pl-11 text-stone-900 placeholder-stone-400 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] transition-all duration-200 outline-none focus:border-amber-400 focus:bg-white focus:ring-amber-400'
                        placeholder='Nhập lại mật khẩu'
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className='rounded-xl border border-red-100/50 bg-red-50 p-3 text-center text-[13px] font-medium text-red-700'>
                  {error}
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className='rounded-xl border border-teal-100/50 bg-teal-50 p-3 text-center text-[13px] font-medium text-teal-700'>
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <div className='flex flex-col gap-4 pt-4'>
              <button
                type='submit'
                disabled={loading}
                className='group relative flex w-full items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-4 text-[15px] font-bold text-white shadow-xl shadow-stone-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-2xl hover:shadow-stone-900/20 focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70'>
                {loading ? (
                  <span className='flex items-center gap-2.5'>
                    <svg
                      className='-ml-1 h-4 w-4 animate-spin text-white'
                      fill='none'
                      viewBox='0 0 24 24'>
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  <>
                    {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                    {!isLogin && <UserPlus className='ml-1 size-4' />}
                  </>
                )}
              </button>

              <div className='relative flex items-center py-2 opacity-60'>
                <div className='grow border-t border-stone-200'></div>
                <span className='mx-4 shrink-0 text-[11px] font-bold tracking-wider text-stone-400 uppercase'>
                  Hoặc
                </span>
                <div className='grow border-t border-stone-200'></div>
              </div>

              <button
                type='button'
                onClick={() => {
                  if (isLogin && isDemo) {
                    setError(
                      'Đây là trang demo, bạn không cần phải tạo tài khoản. Hãy sử dụng tài khoản demo để truy cập với toàn bộ quyền.'
                    )
                    return
                  }
                  setIsLogin(!isLogin)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className='w-full rounded-xl border border-stone-200/80 bg-white py-3.5 text-sm font-semibold text-stone-600 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-stone-50 hover:text-stone-900 focus:outline-none'>
                {isLogin
                  ? 'Chưa có tài khoản? Đăng ký ngay'
                  : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <Link
        href='/'
        className='group absolute top-6 left-6 z-20 flex items-center gap-2 rounded-full border border-stone-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-stone-500 shadow-sm transition-all duration-300 hover:border-stone-300 hover:text-stone-900 hover:shadow-md'>
        <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-1' />
        Trang chủ
      </Link>

      <Link
        href='/about'
        className='group absolute top-6 right-6 z-20 flex items-center gap-2 rounded-full border border-stone-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-stone-500 shadow-sm transition-all duration-300 hover:border-stone-300 hover:text-stone-900 hover:shadow-md'>
        <Info className='size-4 transition-transform group-hover:scale-110' />
        Giới thiệu
      </Link>

      <Footer className='relative z-10 mt-auto border-none bg-transparent' />
    </div>
  )
}
