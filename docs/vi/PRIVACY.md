# Thông báo quyền riêng tư BestHistory

_Cập nhật lần cuối: 2026-08-20_

[← BestHistory](README.md) · [Tất cả ngôn ngữ](../LANGUAGES.md)

BestHistory là extension local-first để tổ chức lịch sử trình duyệt.

## Dữ liệu duyệt web
Lịch sử, URL đã truy cập, tiêu đề trang, metadata website, tag, ghi chú, nội dung tìm kiếm và bản ghi Chế độ riêng tư được xử lý trên thiết bị và không tải lên máy chủ tài khoản BestHistory.

## Tài khoản và quyền
Nếu đăng nhập, BestHistory dùng hạ tầng tài khoản để nhận diện tài khoản và xác định quyền Free / Trial / Pro. Có thể bao gồm ID tài khoản, email và metadata xác thực, ngôn ngữ ưu tiên, trạng thái/thời hạn trial/member/subscription và identifier nhà cung cấp thanh toán trong tương lai.

## Chế độ riêng tư
URL riêng tư, tiêu đề và lượt truy cập được mã hóa trên thiết bị. Mật khẩu riêng tư và dữ liệu riêng tư đã giải mã không được gửi lên máy chủ.

## Backup
Backup được tạo cục bộ và BestHistory không tự động upload. Bản ghi riêng tư vẫn mã hóa; không nên giả định toàn bộ phần lịch sử thông thường trong file đều được mã hóa hoàn toàn.

## Dịch vụ bên thứ ba
BestHistory hiện dùng Supabase cho xác thực/quyền và Amazon SES cho email xác thực. Các dịch vụ này chỉ xử lý dữ liệu cần thiết cho tài khoản và gửi email, không xử lý lịch sử duyệt web.

## Xóa dữ liệu
Có thể xóa dữ liệu BestHistory cục bộ từ extension. Đăng xuất xóa phiên tài khoản cục bộ nhưng không cố ý xóa dữ liệu tổ chức lịch sử cục bộ. Quy trình xóa tài khoản có thể được mở rộng trong Beta.

## Liên hệ
Quyền riêng tư: **besthistory@126.com**
