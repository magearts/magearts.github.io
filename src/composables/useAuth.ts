import { ref } from 'vue'
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/firebase'

/*
 * Who is signed in, for the whole app.
 *
 * Google only. A customer who owns a device has to be the same person
 * tomorrow, on another phone, after clearing their browser - which rules out
 * anonymous accounts, and email with a password would mean running password
 * resets and address verification for a shop with one person in it.
 */

export const user = ref<User | null>(null)

/*
 * False until Firebase has finished looking. It matters: onAuthStateChanged
 * fires with null first while it checks stored credentials, so a page that
 * renders on `user` alone flashes the sign-in screen at somebody who is
 * already signed in, every single time they open it.
 */
export const authReady = ref(false)

onAuthStateChanged(auth, (next) => {
  user.value = next
  authReady.value = true
})

// Only one of these ever resolves to anything; it is how a redirect sign-in
// finishes, on the load after the round trip.
getRedirectResult(auth).catch(() => {})

/*
 * Always ask which account, and never write `new GoogleAuthProvider()` bare
 * anywhere else in this file.
 *
 * Left to itself, Google signs somebody straight back in whenever exactly one
 * of its own sessions is open in that browser - and signing out of this
 * portal does not touch that session, only Firebase's. So somebody who signed
 * out to hand the phone over, or to use their other address, pressed the
 * button and landed back in the account they had just left, with nothing on
 * screen to suggest a choice had been made for them.
 *
 * The cost is one extra tap for everybody with a single account. Being unable
 * to change account at all is the worse of the two, and every Google app
 * asks.
 */
function google() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

export async function signIn() {
  try {
    await signInWithPopup(auth, google())
  } catch (error) {
    const code = (error as { code?: string }).code ?? ''

    // A popup is the better experience where it works, and it does not work
    // everywhere: some in-app browsers refuse to open one, and a few block it
    // silently. Falling back to a redirect costs a page load and always works.
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, google())
      return
    }

    // Closing the popup is a decision, not a failure.
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return
    }

    throw error
  }
}

export function signOutOfPortal() {
  return signOut(auth)
}
