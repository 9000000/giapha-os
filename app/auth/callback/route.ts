import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const authError = requestUrl.searchParams.get('error')

  if (authError) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', requestUrl.origin)
    )
  }

  if (code) {
    const supabase = createClient(await cookies())
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_failed', requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
