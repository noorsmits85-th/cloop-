/**
 * Chuyen doi toan bo thong bao loi xac thuc cua Supabase sang tieng Viet tu nhien,
 * chuan muc thoi trang cao cap va than thien voi nguoi dung.
 */
export function translateAuthError(error: string | null | undefined): string {
  if (!error) return "Đã xảy ra lỗi, vui lòng thử lại!";

  const err = error.trim().toLowerCase();

  // 1. Lỗi thông tin đăng nhập sai (mật khẩu hoặc email sai)
  if (
    err.includes("invalid login credentials") ||
    err.includes("invalid credentials") ||
    err.includes("wrong password") ||
    err.includes("invalid_credentials") ||
    err.includes("invalid password") ||
    err.includes("invalid username or password")
  ) {
    return "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!";
  }

  // 2. Email chưa kích hoạt / xác nhận
  if (
    err.includes("email not confirmed") ||
    err.includes("email_not_confirmed") ||
    err.includes("confirm your email") ||
    err.includes("unconfirmed email")
  ) {
    return "Tài khoản chưa được kích hoạt email. Hệ thống đang tự động kích hoạt, vui lòng thử lại sau giây lát!";
  }

  // 3. Email hoặc tài khoản đã tồn tại khi đăng ký
  if (
    err.includes("user already registered") ||
    err.includes("user already exists") ||
    err.includes("already registered") ||
    err.includes("user_already_exists") ||
    err.includes("identity already exists")
  ) {
    return "Địa chỉ email này đã được đăng ký tài khoản. Vui lòng chọn Đăng nhập hoặc Khôi phục mật khẩu!";
  }

  // 4. Mật khẩu không đủ độ dài / không hợp lệ
  if (
    err.includes("password should be at least") ||
    err.includes("password is too short") ||
    err.includes("weak password") ||
    err.includes("signup requires a valid password")
  ) {
    return "Mật khẩu bảo mật phải có độ dài tối thiểu 6 ký tự.";
  }

  // 5. Quá tần suất gửi email / OTP (Rate limit)
  if (
    err.includes("rate limit") ||
    err.includes("over_email_send_rate_limit") ||
    err.includes("for security purposes, you can only request this once") ||
    err.includes("too many requests") ||
    err.includes("rate_limit")
  ) {
    return "Bạn đã gửi yêu cầu quá nhanh. Vui lòng đợi 60 giây trước khi thử lại để bảo mật tài khoản!";
  }

  // 6. Mã OTP hoặc Token xác thực không hợp lệ / hết hạn
  if (
    err.includes("token has expired") ||
    err.includes("invalid token") ||
    err.includes("invalidtoken") ||
    err.includes("otp expired") ||
    err.includes("token is invalid") ||
    err.includes("recovery token") ||
    err.includes("otp has expired") ||
    err.includes("token_expired") ||
    err.includes("bad_code_verifier")
  ) {
    return "Mã xác thực (OTP) không chính xác hoặc đã hết hạn. Vui lòng kiểm tra hoặc yêu cầu mã mới!";
  }

  // 7. Không tìm thấy người dùng
  if (
    err.includes("user not found") ||
    err.includes("no user found")
  ) {
    return "Không tìm thấy tài khoản liên kết với email này trong hệ thống CLOOP.";
  }

  // 8. Định dạng email không hợp lệ
  if (
    err.includes("invalid format") ||
    err.includes("validate email address") ||
    err.includes("invalid email") ||
    err.includes("invalid_email")
  ) {
    return "Định dạng email không hợp lệ. Vui lòng nhập đúng địa chỉ email (ví dụ: ban@gmail.com)!";
  }

  // 9. Mật khẩu mới trùng mật khẩu cũ
  if (
    err.includes("different from the old password") ||
    err.includes("same as current password")
  ) {
    return "Mật khẩu mới phải khác với mật khẩu cũ bạn đã từng dùng.";
  }

  // 10. Mất phiên đăng nhập
  if (
    err.includes("auth session missing") ||
    err.includes("session expired") ||
    err.includes("jwt expired") ||
    err.includes("session_not_found")
  ) {
    return "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!";
  }

  // 11. Sự cố mạng / Máy chủ
  if (
    err.includes("fetch failed") ||
    err.includes("network request failed") ||
    err.includes("networkerror") ||
    err.includes("failed to fetch")
  ) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền Internet!";
  }

  // Nếu chuỗi lỗi đã chứa ký tự tiếng Việt có dấu, trả về nguyên bản
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(error)) {
    return error;
  }

  // Fallback thân thiện
  return `Thao tác chưa thành công: ${error}`;
}
