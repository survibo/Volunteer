import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
};

type DeviceToken = {
  id: string;
  endpoint: string | null;
  token: unknown;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = getServiceRoleKey();

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase runtime secrets" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const config = await getPushConfig(supabase);
  if (!config.vapid_public_key || !config.vapid_private_key) {
    return json({ error: "Missing VAPID config" }, 500);
  }
  webpush.setVapidDetails(
    config.vapid_subject ?? "mailto:admin@example.com",
    config.vapid_public_key,
    config.vapid_private_key
  );

  const payload = await req.json().catch(() => null);
  const notificationId = payload?.record?.id;

  if (!notificationId) {
    return json({ error: "Invalid notification payload" }, 400);
  }

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, data")
    .eq("id", notificationId)
    .single<NotificationRecord>();

  if (notificationError || !notification) {
    console.error("notification lookup failed", notificationError);
    return json({ error: "Notification lookup failed" }, 500);
  }

  const { data: tokens, error } = await supabase
    .from("device_tokens")
    .select("id, endpoint, token")
    .eq("user_id", notification.user_id)
    .eq("platform", "web");

  if (error) {
    console.error("device token lookup failed", error);
    return json({ error: "Device token lookup failed" }, 500);
  }

  const body = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    notification_id: notification.id,
    url: getNotificationLink(notification) ?? "/",
  });

  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    ((tokens ?? []) as DeviceToken[]).map(async (row) => {
      const subscription = parseSubscription(row);
      if (!subscription) {
        failed += 1;
        return;
      }

      try {
        await webpush.sendNotification(subscription, body);
        sent += 1;
      } catch (err) {
        const statusCode = getStatusCode(err);
        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await supabase
            .from("device_tokens")
            .delete()
            .eq("id", row.id);

          if (deleteError) {
            console.error("expired token cleanup failed", deleteError);
          } else {
            removed += 1;
          }
          return;
        }

        failed += 1;
        console.error("push send failed", err);
      }
    })
  );

  return json({ sent, removed, failed });
});

function parseSubscription(row: DeviceToken) {
  if (!row.token) return null;

  let subscription: Record<string, unknown>;

  try {
    subscription =
      typeof row.token === "string"
        ? JSON.parse(row.token)
        : (row.token as Record<string, unknown>);
  } catch {
    return null;
  }

  if (!subscription.endpoint && row.endpoint) {
    subscription.endpoint = row.endpoint;
  }

  return subscription;
}

function getNotificationLink(notification: NotificationRecord) {
  const data = notification.data ?? {};
  const kind =
    data.kind === "education" || data.activity_type === "education"
      ? "education"
      : "volunteer";
  const activityId =
    typeof data.activity_id === "string" ? data.activity_id : null;
  const userId = typeof data.user_id === "string" ? data.user_id : null;
  const activityBase = kind === "education" ? "/education" : "/volunteer";

  switch (notification.type) {
    case "new_activity":
    case "activity_reminder":
    case "activity_cancelled":
    case "activity_updated":
    case "deadline_approaching":
      return activityId ? `${activityBase}/${activityId}` : activityBase;
    case "application_accepted":
    case "application_rejected":
    case "application_status":
    case "application_received":
      return kind === "education"
        ? "/mylist?tab=education"
        : "/mylist?tab=volunteer";
    case "member_approved":
      return "/mypage";
    case "new_member_registered":
      return userId ? `/admin/members/${userId}` : "/admin";
    case "activity_capacity_full":
      if (!activityId) return "/admin";
      return kind === "education"
        ? `/admin/education/${activityId}/applications`
        : `/admin/volunteer/${activityId}/applications`;
    case "new_admin_granted":
      return "/admin";
    default:
      return null;
  }
}

function getStatusCode(err: unknown) {
  if (typeof err === "object" && err && "statusCode" in err) {
    return Number((err as { statusCode?: number }).statusCode);
  }
  return null;
}

function getServiceRoleKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  try {
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return secretKeys.service_role ?? secretKeys.serviceRole ?? null;
  } catch {
    return null;
  }
}

async function getPushConfig(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("push_config")
    .select("key, value")
    .in("key", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);

  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((row) => [row.key, row.value])
  ) as {
    vapid_public_key?: string;
    vapid_private_key?: string;
    vapid_subject?: string;
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
