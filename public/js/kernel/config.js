// Deployment settings: the only file you edit to point the OS at your Supabase project.
// The anon key is meant to be public; your row-level security and storage policies protect the data.
// Never put the service_role key here.
export const CFG = {
  supabaseUrl: 'https://hgkgopoqxjvbcpwmnopy.supabase.co',   // e.g. 'https://abcdefgh.supabase.co'  (empty = no accounts: files stay in this browser / the runner)
  supabaseKey: 'sb_publishable_iqB20wX04td0KEhZkLNz4g__d9iu-23',   // the project's anon key
  runnerUrl: '',     // '' when the page is served by server/server.mjs; otherwise e.g. 'https://runner.example.com'
};
