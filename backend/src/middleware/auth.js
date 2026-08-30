'use strict';

const { createClient } = require('@supabase/supabase-js');

// Use the service-role key for server-side auth verification so we can call
// auth.getUser() without being subject to RLS.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

/**
 * protect — verifies the Supabase JWT in the Authorization header.
 * Attaches req.user = { id, email, name, is_admin, department } on success.
 * Admins have department=null (they see everything).
 * Regular users have department set from user_metadata.
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorised — no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Session invalid or expired — please log in again' });
    }

    const isAdmin = !!user.user_metadata?.is_admin;

    req.user = {
      id:         user.id,
      email:      user.email,
      name:       user.user_metadata?.full_name || user.email,
      is_admin:   isAdmin,
      // Admins see all departments — their department field is null/ignored
      department: isAdmin ? null : (user.user_metadata?.department || null),
    };

    next();
  } catch (err) {
    console.error('protect middleware error:', err.message);
    return res.status(401).json({ success: false, message: 'Token verification failed' });
  }
}

/**
 * adminOnly — must be used after protect.
 * Returns 403 if the user is not an admin.
 */
function adminOnly(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

/**
 * deptGuard(deptParam) — call with the department string to check.
 * If the logged-in user is not admin, rejects 403 if the requested department
 * doesn't match their own. Admins always pass through.
 *
 * Usage (inline in a controller):
 *   const guard = deptGuard(req.user, requestedDept, res);
 *   if (!guard) return; // 403 already sent
 */
function deptGuard(user, requestedDept, res) {
  if (user.is_admin) return true; // admins see everything
  if (!user.department) {
    res.status(403).json({ success: false, message: 'No department assigned to your account. Contact an admin.' });
    return false;
  }
  if (user.department !== requestedDept) {
    res.status(403).json({ success: false, message: `Access denied — you can only view data for ${user.department}` });
    return false;
  }
  return true;
}

module.exports = { protect, adminOnly, deptGuard };
