import fs from 'fs'

const envContent = fs.readFileSync('c:/Users/Queta/petalapp/.env', 'utf-8')
let url = ''
let key = ''

for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/"/g, '')
  // We need the service role key! Wait, .env in petalapp doesn't have the service role key.
}

console.log("URL:", url)
