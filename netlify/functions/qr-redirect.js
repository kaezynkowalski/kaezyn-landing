import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  try {
    const slug = event.path.split('/').pop()

    if (!slug) {
      return redirectError()
    }

    // 1️⃣ Buscar QR
    const { data: qr, error: qrError } = await supabase
      .from('qr_links')
      .select('business_id, fillout_form_id, active')
      .eq('slug', slug)
      .single()

    if (qrError || !qr || !qr.active) {
      return redirectError()
    }

    // 2️⃣ Buscar negocio
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select(`
        activo,
        client_id,
        business_name,
        google_review_url,
        manager_email,
        manager_phone,
        language,
        environment
      `)
      .eq('id', qr.business_id)
      .single()

    if (bizError || !business || !business.activo) {
      return redirectError()
    }

    // 3️⃣ Construir URL Fillout
    const params = new URLSearchParams({
      client_id: business.client_id,
      business_name: business.business_name,
      google_review_url: business.google_review_url,
      manager_email: business.manager_email,
      manager_phone: business.manager_phone,
      language: business.language,
      environment: business.environment
    })

    const filloutUrl = `https://forms.fillout.com/t/${qr.fillout_form_id}?${params.toString()}`

    return {
      statusCode: 302,
      headers: {
        Location: filloutUrl,
        'Cache-Control': 'no-store'
      }
    }

  } catch (e) {
    return redirectError()
  }
}

function redirectError() {
  return {
    statusCode: 302,
    headers: {
      Location: 'https://kaezyn.com/qr-invalido',
      'Cache-Control': 'no-store'
    }
  }
}
