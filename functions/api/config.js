function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

// 动态从 KV 读取当前生效的管理员密码进行比对，免配环境变量
async function checkAuth(request, env) {
    const authHeader = request.headers.get("Authorization") || "";
    const clientToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!clientToken) return false;

    let validPwd = "admin888"; // 初始默认密码
    try {
        const rawConfig = await env.NAV_DB.get("site_config");
        if (rawConfig) {
            const parsed = JSON.parse(rawConfig);
            if (parsed && parsed.adminPwd) {
                validPwd = parsed.adminPwd;
            }
        }
    } catch (e) {
        console.error("读取 KV 配置失败:", e);
    }

    return clientToken === validPwd;
}

export async function onRequest(context) {
    const { request, env } = context;

    // 1. GET 请求：获取站点配置
    if (request.method === "GET") {
        try {
            const data = await env.NAV_DB.get("site_config");
            return new Response(data || "{}", {
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            return json({ success: false, message: "读取数据失败" }, 500);
        }
    }

    // 2. POST 请求：更新站点配置（需要鉴权）
    if (request.method === "POST") {
        const isAuthorized = await checkAuth(request, env);
        if (!isAuthorized) {
            return json({ success: false, message: "未授权或密码错误" }, 401);
        }

        try {
            const body = await request.text();
            // 校验是否为合法 JSON
            JSON.parse(body);
            await env.NAV_DB.put("site_config", body);
            return json({ success: true, message: "保存成功" });
        } catch (error) {
            return json({ success: false, message: "数据格式错误或保存失败" }, 500);
        }
    }

    return new Response("Method not allowed", { status: 405 });
}
