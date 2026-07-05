function getStorageConfig() {
  const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!PROJECT_REF || !SERVICE_KEY) {
    throw new Error("SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY are required for storage.");
  }
  return {
    PROJECT_REF,
    SERVICE_KEY,
    STORAGE_URL: `https://${PROJECT_REF}.supabase.co/storage/v1`,
  };
}

export const BUCKETS = {
  store: "store-files",
  formations: "formation-files",
};

async function ensureBucket(bucket: string) {
  const { SERVICE_KEY, STORAGE_URL } = getStorageConfig();
  const res = await fetch(`${STORAGE_URL}/bucket/${bucket}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  });
  if (res.status === 200) return;
  await fetch(`${STORAGE_URL}/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  });
}

export async function getPresignedUploadUrl(
  bucket: string,
  filename: string,
): Promise<{ signedUrl: string; publicUrl: string }> {
  const { PROJECT_REF, SERVICE_KEY, STORAGE_URL } = getStorageConfig();
  await ensureBucket(bucket);
  const res = await fetch(
    `${STORAGE_URL}/object/upload/sign/${bucket}/${encodeURIComponent(filename)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Presign échoué: ${err}`);
  }
  const json = (await res.json()) as any;
  const signedUrl = `https://${PROJECT_REF}.supabase.co/storage/v1${json.url}`;
  const publicUrl = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${bucket}/${filename}`;
  return { signedUrl, publicUrl };
}

export async function uploadToStorage(
  bucket: string,
  filename: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const { PROJECT_REF, SERVICE_KEY, STORAGE_URL } = getStorageConfig();
  await ensureBucket(bucket);
  const res = await fetch(`${STORAGE_URL}/object/${bucket}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": mimetype,
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload Supabase échoué: ${err}`);
  }
  return `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${bucket}/${filename}`;
}
