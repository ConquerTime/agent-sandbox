import * as k8s from '@kubernetes/client-node';

let kubeConfig: k8s.KubeConfig | null = null;
let appsApi: k8s.AppsV1Api | null = null;
let coreApi: k8s.CoreV1Api | null = null;

export function getKubeConfig(): k8s.KubeConfig {
  if (kubeConfig) return kubeConfig;
  const kc = new k8s.KubeConfig();
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster();
  } else {
    kc.loadFromDefault();
  }
  kubeConfig = kc;
  return kc;
}

export function getAppsApi(): k8s.AppsV1Api {
  if (!appsApi) {
    appsApi = getKubeConfig().makeApiClient(k8s.AppsV1Api);
  }
  return appsApi;
}

export function getCoreApi(): k8s.CoreV1Api {
  if (!coreApi) {
    coreApi = getKubeConfig().makeApiClient(k8s.CoreV1Api);
  }
  return coreApi;
}

/** Test helper: reset cached clients. */
export function resetK8sClients(): void {
  kubeConfig = null;
  appsApi = null;
  coreApi = null;
}
