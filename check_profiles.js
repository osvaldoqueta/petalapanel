import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.log('Missing env vars')
  process.exit(1)
}

const supabase = createClient(url, key)

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .in('email', ['osvaldoqueta@gmail.com', 'englishqueta@gmail.com'])
  
  if (error) {
    console.error('Error fetching profiles:', error)
  } else {
    console.log('Profiles found by email:', JSON.stringify(data, null, 2))
  }

  // Also try to find by checking users first
  const { data: users, error: errUsers } = await supabase.auth.admin.listUsers()
  if (errUsers) {
    console.error('Error fetching users:', errUsers)
  } else {
    const targetUsers = users.users.filter(u => ['osvaldoqueta@gmail.com', 'englishqueta@gmail.com'].includes(u.email || ''))
    console.log('Auth users found:', targetUsers.map(u => ({ id: u.id, email: u.email })))

    if (targetUsers.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('id', targetUsers.map(u => u.id))
      console.log('Profiles found by id:', JSON.stringify(profs, null, 2))
    }
  }
}

check()
