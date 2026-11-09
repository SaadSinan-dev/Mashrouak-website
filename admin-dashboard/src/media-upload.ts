import { ApiError, apiOrigin } from "../../src/lib/platform-api";

// Browser progress measures bytes sent to the Worker. Processing follows separately.
export function uploadMedia(
  path: string,
  body: FormData,
  onProgress: (value: number) => void,
) {
  return new Promise<{ cleanup_pending?: boolean }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiOrigin}/api${path}`);
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.setRequestHeader("X-Mashrouak-Request", "1");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let data: { error?: string; cleanup_pending?: boolean };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("network_error"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else {
        if (xhr.status === 401)
          window.dispatchEvent(new Event("mashrouak:unauthorized"));
        reject(new ApiError(data.error ?? "server_error", xhr.status));
      }
    };
    xhr.onerror =
      xhr.ontimeout =
      xhr.onabort =
        () => reject(new Error("network_error"));
    xhr.send(body);
  });
}
