// js/auth.js
import { auth, db, functions } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";
import { t } from './i18n.js';
import { showToast, showLoading, hideLoading } from './utils.js';

// ========== User State ==========
let currentUser = null;
let currentUserData = null;

export function getCurrentUser() { return currentUser; }
export function getCurrentUserData() { return currentUserData; }
export function isDoctor() { return currentUserData?.role === 'doctor'; }
export function isAssistant() { return currentUserData?.role === 'assistant'; }

// ========== Register Doctor ✅ FIXED ==========
export async function registerDoctor(email, password, fullName, clinicName, phone) {
  showLoading();
  try {
    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('بريد إلكتروني غير صحيح');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    // Validate name
    if (!fullName || fullName.trim().length < 2) {
      throw new Error('الاسم الكامل مطلوب');
    }

    console.log('Creating user in Firebase Auth...');
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('User created:', user.uid);
    console.log('Updating profile...');
    
    // Update display name
    await updateProfile(user, { displayName: fullName });
    
    console.log('Creating Firestore document...');
    
    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: email.toLowerCase(),
      fullName: fullName.trim(),
      clinicName: (clinicName || fullName).trim(),
      phone: phone || '',
      role: 'doctor',
      subscribed: false,
      subscriptionStatus: 'trial',
      subscriptionPlan: 'trial',
      subscriptionEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days trial
      createdAt: new Date(),
      lastLogin: new Date(),
      settings: {
        workingHours: { start: '08:00', end: '17:00', days: [0, 1, 2, 3, 4] },
        appointmentDuration: 30,
        currency: 'DZD',
        language: 'ar'
      }
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    
    console.log('Firestore document created successfully');
    
    hideLoading();
    return { success: true, user, data: userData };
    
  } catch (error) {
    hideLoading();
    console.error('Registration error:', error);
    
    // Map Firebase error codes to Arabic messages
    let errorMessage = error.message;
    
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'بريد إلكتروني غير صحيح';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'البريد الإلكتروني مستخدم مسبقاً';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'عملية غير مسموحة';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'فشل الاتصال بالشبكة';
    }
    
    return { success: false, error: errorMessage };
  }
}

// ========== Login ✅ FIXED ==========
export async function login(email, password) {
  showLoading();
  try {
    // Validate inputs
    if (!email || !password) {
      throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
    }

    console.log('Attempting login...');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('Login successful:', user.uid);
    console.log('Fetching user data...');
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.error('User document not found');
      throw new Error('بيانات المستخدم غير موجودة');
    }
    
    const userData = userDoc.data();
    
    // Check subscription status
    if (userData.subscriptionStatus === 'expired') {
      console.warn('Subscription expired but allowing login');
      showToast('اشتراكك انتهى. بعض الميزات محدودة.', 'warning');
    }
    
    // Update last login
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: new Date()
    }).catch(err => console.log('Could not update last login:', err));
    
    hideLoading();
    console.log('Login successful');
    return { success: true, user, data: userData };
    
  } catch (error) {
    hideLoading();
    console.error('Login error:', error);
    
    let errorMessage = error.message;
    
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'بريد إلكتروني غير صحيح';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'المستخدم غير موجود';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'كلمة المرور غير صحيحة';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'بيانات الدخول غير صحيحة';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'محاولات كثيرة. حاول لاحقاً.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'فشل الاتصال بالشبكة';
    }
    
    return { success: false, error: errorMessage };
  }
}

// ========== Reset Password ✅ FIXED ==========
export async function resetPassword(email) {
  try {
    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('بريد إلكتروني غير صحيح');
    }

    console.log('Sending password reset email to:', email);
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    
    console.log('Password reset email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    let errorMessage = error.message;
    
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'بريد إلكتروني غير صحيح';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'المستخدم غير موجود';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'محاولات كثيرة. حاول لاحقاً.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'فشل الاتصال بالشبكة';
    }
    
    return { success: false, error: errorMessage };
  }
}

// ========== Logout ==========
export async function logout() {
  try {
    await signOut(auth);
    currentUser = null;
    currentUserData = null;
    showToast('تم تسجيل الخروج', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  } catch (error) {
    console.error('Logout error:', error);
    showToast('فشل تسجيل الخروج', 'error');
  }
}

// ========== Create Assistant ==========
export async function createAssistant(email, password, fullName, permissions) {
  if (!isDoctor()) {
    showToast('فقط الأطباء يمكنهم إنشاء مساعدين', 'error');
    return { success: false };
  }
  
  showLoading();
  try {
    const createAssistantFn = httpsCallable(functions, 'createAssistant');
    const result = await createAssistantFn({ email, password, fullName, permissions });
    
    hideLoading();
    showToast('تم إنشاء المساعد بنجاح', 'success');
    return result.data;
    
  } catch (error) {
    hideLoading();
    console.error('Create assistant error:', error);
    showToast(error.message || 'فشل في إنشاء المساعد', 'error');
    return { success: false, error: error.message };
  }
}

// ========== Delete Assistant ==========
export async function deleteAssistant(assistantId) {
  if (!isDoctor()) return { success: false };
  
  showLoading();
  try {
    const deleteAssistantFn = httpsCallable(functions, 'deleteAssistant');
    await deleteAssistantFn({ assistantId });
    hideLoading();
    showToast('تم حذف المساعد', 'success');
    return { success: true };
    
  } catch (error) {
    hideLoading();
    console.error('Delete assistant error:', error);
    showToast(error.message || 'فشل في حذف المساعد', 'error');
    return { success: false };
  }
}

// ========== Get Assistants ==========
export async function getAssistants() {
  if (!isDoctor()) return [];
  
  try {
    const q = query(
      collection(db, 'users'),
      where('doctorId', '==', currentUser.uid),
      where('role', '==', 'assistant')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
  } catch (error) {
    console.error('Get assistants error:', error);
    return [];
  }
}

// ========== Update Assistant Permissions ==========
export async function updateAssistantPermissions(assistantId, permissions) {
  if (!isDoctor()) return { success: false };
  
  try {
    await updateDoc(doc(db, 'users', assistantId), { permissions });
    showToast('تم تحديث الصلاحيات', 'success');
    return { success: true };
    
  } catch (error) {
    console.error('Update permissions error:', error);
    showToast('فشل في تحديث الصلاحيات', 'error');
    return { success: false };
  }
}

// ========== Delete Account ==========
export async function deleteAccount() {
  if (!confirm('هل أنت متأكد من حذف الحساب؟ لا يمكن التراجع.')) return;
  
  showLoading();
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid));
    await deleteUser(currentUser);
    hideLoading();
    showToast('تم حذف الحساب', 'success');
    window.location.href = 'index.html';
    
  } catch (error) {
    hideLoading();
    console.error('Delete account error:', error);
    showToast('فشل في حذف الحساب', 'error');
  }
}

// ========== Auth State Listener ==========
export function initAuthListener(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        currentUserData = userDoc.exists() ? userDoc.data() : null;
        
        // Update last login
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: new Date()
        }).catch(() => {});
        
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    } else {
      currentUser = null;
      currentUserData = null;
    }
    
    if (callback) callback(currentUser, currentUserData);
  });
}

// ========== Protect Pages ==========
export function requireAuth(redirectTo = 'index.html') {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        console.log('Not authenticated, redirecting to:', redirectTo);
        window.location.href = redirectTo;
        resolve(false);
      } else {
        console.log('User authenticated:', user.uid);
        resolve(true);
      }
    });
  });
}

export function requireDoctor(redirectTo = 'index.html') {
  return new Promise((resolve) => {
    initAuthListener((user, data) => {
      if (!user) {
        window.location.href = 'index.html';
        resolve(false);
      } else if (data?.role !== 'doctor') {
        showToast('هذه الصفحة للأطباء فقط', 'error');
        window.location.href = redirectTo;
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// ========== Permissions ==========
export function hasPermission(permission) {
  if (isDoctor()) return true;
  if (!isAssistant()) return false;
  
  const perms = currentUserData?.permissions || {};
  return perms[permission]?.write || perms[permission]?.read || false;
}

export function hasWritePermission(module) {
  if (isDoctor()) return true;
  const perms = currentUserData?.permissions || {};
  return perms[module]?.write || false;
}
