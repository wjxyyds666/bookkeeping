export async function onRequestGet(context) {
  const { data } = context;
  return new Response(JSON.stringify({ code: 200, data: data.user }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
