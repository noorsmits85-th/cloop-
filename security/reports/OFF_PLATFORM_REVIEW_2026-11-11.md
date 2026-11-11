# Rà soát chống giao dịch ngoài CLOOP

Ngày: 11/11/2026, Asia/Saigon. Mục tiêu: hạn chế người thuê và chủ đồ tìm được liên hệ trực tiếp để bỏ qua đặt đơn/thanh toán trên CLOOP. Đây là rà soát chính sách sản phẩm và đường đi dữ liệu; không sửa ứng dụng, không đăng nội dung thật, không thử huỷ/hoàn tiền trên production. Không khẳng định đây là chính sách hoặc cách triển khai thực tế của By Rotation.

**Chính sách người dùng đã chốt trong phiên này: luôn che số điện thoại/email giữa hai bên; giao nhận qua CLOOP hoặc đơn vị vận chuyển.** Các đề xuất dưới đây phải áp dụng chính sách này ở mọi trạng thái đơn, kể cả PAID và hoàn tất. Phương án chỉ mở liên hệ sau thanh toán bên dưới là phân tích giới hạn, không phải lựa chọn triển khai.

## Kết luận

**CLOOP hiện chưa đáp ứng mục tiêu không cho hai bên liên hệ ngoài.** Có che số trước thanh toán ở mobile và che một số trường ở web, nhưng nội dung tự đăng, ảnh, địa chỉ và dữ liệu giao nhận còn nhiều đường vòng. Đặc biệt chính sách mobile mở số sau PAID và tiếp tục trả số khi đơn hoàn tất/tranh chấp. Việc che lại sau khi đã lộ không thể thu hồi thông tin người dùng đã lưu.

Kịch bản mất đơn khả thi ở mức logic: chủ đồ đặt số/Zalo trong blog/hồ sơ/mô tả/ảnh → người thuê nhìn thấy trước khi đặt đơn → hai bên thỏa thuận ngoài. Blog và review đã được tái hiện bằng thực thi hàm thật với database giả. Không thực hiện giao dịch ngoài thật và không định lượng doanh thu thất thoát.

## Các đường thoát đã kiểm tra

| Điểm | Hiện trạng | Bằng chứng / giới hạn |
|---|---|---|
| Blog / ký ức | Nhận số điện thoại, email, lời mời Zalo rồi xuất bản PUBLIC và trả nguyên nội dung trong feed | Đã tái hiện `createBlogPostAction` → `getPublicBlogFeedAction`, `app/actions/blog.ts:86,111,136,183`. Dữ liệu giả, không đăng thật. |
| Đánh giá | Khách đủ điều kiện có thể ghi thông tin liên hệ vào comment được xuất bản ngay | Đã tái hiện `submitVerifiedProductReviewAction`, `app/actions/review.ts:130-132`. Điều kiện đơn đã trả/hoàn tất và PAID có kiểm tra; đường này ảnh hưởng đơn sau. |
| Tên / bio / quote / ký ức hồ sơ | Các trường tự do được ghi và trả công khai, chưa thấy bộ chặn giao dịch ngoài | `app/actions/closet.ts:178-183,235-319`, `app/actions/user.ts`. Các kiểm tra độ dài/Zod không phải kiểm tra nội dung liên hệ. Metadata Supabase do người dùng sửa được nên chỉ chặn form không đủ. |
| Tên / mô tả / phân loại sản phẩm | Chưa thấy bộ kiểm duyệt liên hệ ở các đường tạo/sửa | `app/actions/product.ts:96-125,150-170,616-671`; `app/api/products/route.ts` và `lib/validations/product.ts`. Cần áp dụng cả create, edit, publish và các đường API khác nhau. |
| Ảnh sản phẩm / avatar / cover / review | Chưa có OCR/QR anti-contact trong luồng công bố đã đọc | `src/services/imageModeration.ts` chủ yếu phân loại có trang phục hay không; thiếu key/timeout cho PENDING_REVIEW với `isApproved: true`. `app/(dashboard)/my-closet/create/actions.ts` chỉ dừng REJECTED. `app/actions/product.ts` và sửa ảnh không gọi cùng moderation. Chưa thử OCR với ảnh thật. |
| Địa chỉ công khai | Hàm che địa chỉ có thể trả nguyên địa chỉ một thành phần | `src/utils/shipping.ts:80-115`: chuỗi không có dấu phẩy được giữ nguyên. Đã tái hiện với địa chỉ giả. Có thể gây lộ địa điểm nhận đồ hoặc chứa liên hệ chèn vào trường location. |
| Mobile đơn hàng | Che khi chưa trả tiền, mở sau PAID, kể cả completed/dispute | Đã chạy `getMyClosetMobileDataAction`: PENDING invoice bị che; PAID + PENDING_APPROVAL, LENDER_COMPLETED, DISPUTE trả nguyên số; CANCELLED bị che. `app/actions/closet.ts:752-802`. Không phải bypass thanh toán: đây là chính sách đang viết trong code. |
| Web đơn hàng | Mở theo lifecycle, khác mobile; có nút gọi chủ đồ | `src/utils/shipping.ts:139`: OWNER_PACKED/LENDER_SHIPPED/BORROWER_RECEIVED trả nguyên order, hàm không kiểm PAID. `OrdersClient.tsx:1530-1567` hiển thị địa chỉ chính xác và `tel:` ở self-pickup. Chưa chứng minh có thể đưa đơn chưa thanh toán tới trạng thái active. |
| Payload vận chuyển | Che một số trường nhưng giữ providerRawPayload và các alias khác | Đã tái hiện số giả còn trong `shipments[].providerRawPayload`, `pickupAddress.fullAddress`. `orders/page.tsx:86,149` chọn providerRawPayload và serialize sang client. Khả năng lộ số thật phụ thuộc nội dung provider trả. |
| API tủ đồ công khai | Tọa độ/snapshot/đồ ẩn còn được trả | Phát hiện ở báo cáo adversarial trước: `getClosetProducts`, `app/actions/closet.ts:473-500`. Tọa độ hoặc snapshot có thể thành đường tìm liên hệ/vị trí. |

## Kiểm thử thực tế trong phiên này

Chạy: `node security/reports/off-platform-local-2026-11-11.cjs`.

Tất cả assertions trong harness đạt; bằng chứng ở `off-platform-local-2026-11-11.json`. Harness thực thi các export TypeScript thật, mock toàn bộ database/auth, không mạng, không có secret và không chạm dữ liệu khách hàng. Các nhóm kiểm tra: địa chỉ nguyên chuỗi, bỏ sót alias/provider payload, điều kiện mở PII không xét thanh toán trong helper, blog liên hệ được xuất bản, review liên hệ được xuất bản, và ma trận trạng thái mobile.

Các mẫu review/blog có số điện thoại tổng hợp và email `example.invalid`. Không truy cập/hay in số liên hệ thật. Chưa xác nhận bản production có cùng commit với mã nguồn hiện tại. Các request production ở báo cáo trước không kiểm tra nội dung của người dùng.

## Chính sách nên thống nhất

Nếu mục tiêu là **không cho trao đổi liên hệ ngoài kể cả sau thanh toán**, không thể giữ quy tắc “PAID là mở SĐT”. Nên có một chính sách server dùng chung cho web/mobile/actions/API:

| Người nhận | Thông tin cần thấy |
|---|---|
| Khách công khai | Tên hiển thị an toàn, khu vực rộng, nội dung/ảnh đã kiểm duyệt; không email/SĐT/QR/liên kết mạng xã hội/tọa độ chính xác. |
| Người thuê/chủ đồ thuộc đơn | Mã đơn, trạng thái giao nhận, chat trong app hoặc hỗ trợ qua CLOOP; không số/email/ngân hàng đối tác và không raw payload hãng vận chuyển. |
| Đơn vị vận chuyển | Dữ liệu người gửi/người nhận cần thiết, truyền server-to-server; không làm dữ liệu trả cho hãng thành dữ liệu trả cho cả hai người dùng. |
| CSKH/admin | Quyền truy cập theo nhiệm vụ, xác thực/phân quyền và audit; bảo toàn thông tin cần giải quyết đơn. |

Nếu chỉ muốn che **trước thanh toán**, vẫn phải sửa các đường nội dung tự đăng và alias, nhưng việc lộ số sau PAID sẽ cho phép bỏ nền tảng ở các đơn tiếp theo. Không nên coi PAID hoặc tiền cọc là bằng chứng rằng mọi đơn tương lai sẽ ở lại CLOOP.

Tự đến nhận đồ cần quyết định sản phẩm riêng: lịch hẹn và chat trong app, mã nhận đồ dùng một lần, điểm nhận trung gian hoặc điểm giao nhận CLOOP. Nếu vẫn giao trực tiếp tại nhà chủ đồ và nhìn nhãn gửi hàng, có thể biết địa chỉ/liên hệ ngoài ứng dụng. Không thể cam kết ngăn 100% bằng code; giải pháp cần kết hợp quy trình và lợi ích đặt đơn trên nền tảng.

## Thứ tự sửa đề xuất

1. **Đóng dữ liệu liên hệ ở server trước:** DTO theo vai trò/mục đích; loại raw provider payload; bỏ số/email/ngân hàng đối tác; khu vực công khai lấy từ trường địa giới chuẩn thay vì suy luận địa chỉ tự do bằng dấu phẩy. Áp dụng đồng bộ web/mobile/phân trang/API. Không phá dữ liệu dùng bởi hãng vận chuyển hoặc thông tin cá nhân chính chủ.
2. **Chặn nội dung liên hệ ở mọi đường tạo/sửa/công bố:** tên hiển thị, tên sản phẩm, mô tả, bio, quote, blog, review và các trường tự do có hiển thị công khai. Chuẩn hoá Unicode/zero-width/dấu cách/ký tự số trước nhận diện số điện thoại, email, URL, tài khoản xã hội và ý định giao dịch ngoài. Ví dụ: `09 00 00 00 00`, số Unicode, `ten [at] ...`, `Zalo: ...`. Phát hiện mơ hồ chuyển duyệt, không tự khoá tài khoản hoặc xoá nội dung chỉ vì regex.
3. **Kiểm duyệt ảnh tại điểm công bố:** OCR + phát hiện QR/link và thông tin liên hệ ở ảnh, avatar, cover; không chỉ ở ảnh chính. Khi dịch vụ lỗi hoặc chưa kiểm tra thì giữ nháp/chờ duyệt, không đưa ra công khai. Thay ảnh/sửa nội dung phải xét duyệt lại. Liên kết kết quả duyệt với hash/revision ảnh và chủ sở hữu; không tin cờ “đã duyệt” do client gửi.
4. **Nội dung cũ:** rà soát có phân quyền và đánh dấu chờ xử lý; kiểm duyệt cả khi đọc trong thời gian chuyển đổi, vì profile metadata có đường ghi trực tiếp. Không tự động xoá dữ liệu hay lịch sử đơn.
5. **Giữ đơn bằng trải nghiệm:** chat/hỗ trợ trong app, lịch nhận trả, vận chuyển và thanh toán tiện, quyền lợi tranh chấp/hoàn tiền rõ ràng. Ghi audit các lần chặn/chờ duyệt và theo dõi tỷ lệ huỷ/bỏ checkout sau trao đổi, tránh lưu thêm PII không cần thiết.

Không chặn form đăng nhập, KYC, tài khoản ngân hàng hoặc địa chỉ giao nhận chính chủ chỉ vì có số/email: những dữ liệu này cần được thu riêng và bảo vệ, không xuất ra trường công khai. Không xem việc người dùng báo giao dịch ngoài cho CSKH là vi phạm; phải giữ được luồng khiếu nại.

## Điều kiện nghiệm thu

- Gọi trực tiếp API/Server Action vẫn không xuất bản liên hệ ngoài, kể cả bypass UI và sửa nội dung sau duyệt.
- Khách công khai không nhận số/email/tọa độ/raw snapshot/địa chỉ chính xác trong HTML, RSC, JSON hoặc metadata.
- Có test 2 tài khoản cho mọi trạng thái PENDING/PAID/CANCELLED/COMPLETED/DISPUTE; đối chiếu cả web và mobile.
- Ảnh có QR/số/liên hệ ở ảnh phụ/avatar/cover không được công khai trước duyệt; lỗi OCR không làm publish fail-open.
- Các mẫu hợp lệ như số đo, kích cỡ, giá tiền, ngày thuê, mã đơn và mô tả chất liệu không bị chặn hàng loạt.
- Giao nhận, thanh toán, KYC và CSKH vẫn dùng được dữ liệu cần thiết qua đúng quyền; kiểm thử với dữ liệu giả và sandbox.
- Không tự từ chối hoàn tiền hoặc giữ cọc chỉ vì tín hiệu nghi ngờ lách nền tảng; xử lý bằng chính sách được công bố và xét duyệt.

Chưa có thay đổi code/migration/deploy trong lượt rà soát này. Chính sách đã chốt là luôn dùng trung gian và không mở số/email đối tác sau thanh toán; cần thiết kế lại self-pickup/giao trực tiếp cho phù hợp khi triển khai.
