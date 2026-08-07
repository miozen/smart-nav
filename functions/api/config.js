function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

function isAdmin(request, env) {
    const token = env.ADMIN_TOKEN;
    const auth = request.headers.get("Authorization") || "";
    return Boolean(token) && auth === `Bearer ${token}`;
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === "GET") {
        const data = await env.NAV_DB.get("site_config");
        return new Response(data || "{}", {
            headers: { "Content-Type": "application/json" }
        });
    }

    if (request.method === "POST") {
        if (!isAdmin(request, env)) {
            return json({ success: false, message: "未授权" }, 401);
        }

        try {
            const body = await request.text();
            JSON.parse(body);
            await env.NAV_DB.put("site_config", body);
            return json({ success: true });
        } catch (error) {
            return json({ success: false, message: "保存失败" }, 500);
        }
    }

    return new Response("Method not allowed", { status: 405 });
}
