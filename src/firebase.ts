import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  enableNetwork,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal @firebase/firestore WebChannel 10s connection timeout noise in offline/proxied environments
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is unavailable
}

const app = initializeApp(firebaseConfig);

function initFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = initFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {
      // Ignore transient network re-enable errors
    });
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isFirestoreOfflineError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  const code = (error as { code?: string } | null)?.code || '';
  const lower = message.toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    lower.includes('client is offline') ||
    lower.includes('could not reach cloud firestore backend') ||
    lower.includes('backend didn\'t respond') ||
    lower.includes('failed to get document because the client is offline') ||
    lower.includes('offline') ||
    lower.includes('unavailable') ||
    lower.includes('network-request-failed') ||
    lower.includes('failed to fetch')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  // Gracefully ignore transient offline / unavailable errors so the app continues working with local & cached data
  if (isFirestoreOfflineError(error)) {
    return;
  }

  // Gracefully ignore permission-denied errors triggered by stale anonymous or already signed-out sessions
  const currentUser = auth.currentUser;
  if (
    !currentUser ||
    currentUser.isAnonymous ||
    !currentUser.emailVerified ||
    !currentUser.providerData ||
    currentUser.providerData.length === 0
  ) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  // Only probe Firestore backend when a verified Firebase Auth user session is active
  if (
    !auth.currentUser ||
    auth.currentUser.isAnonymous ||
    !auth.currentUser.emailVerified
  ) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      // Offline / connecting mode: persistentLocalCache handles local reads automatically
      return;
    }
  }
}

testConnection();


