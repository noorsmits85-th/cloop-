import os
import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="{color}"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color}"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
                <w:insideV w:val="none"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr[0].append(borders)

doc = docx.Document()

# Căn lề chuẩn văn bản hành chính/kỹ thuật: Trên 2cm, Dưới 2cm, Trái 3cm, Phải 2cm
for section in doc.sections:
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(2.0)
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)

# Cấu hình Font mặc định: Times New Roman, size 13pt
style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(13)
font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
style.paragraph_format.line_spacing = 1.25
style.paragraph_format.space_after = Pt(4)

def add_doc_title(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(15.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x0A, 0x25, 0x17)

def add_doc_subtitle(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(14)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11.5)
    run.font.italic = True
    run.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

def add_heading_1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x0F, 0x4A, 0x34)

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x18, 0x3A, 0x2D)

def add_heading_3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(7)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.italic = True
    run.font.color.rgb = RGBColor(0x27, 0x4E, 0x3D)

def add_body_p(text, bold_prefix=None, italic_suffix=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(4)
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = 'Times New Roman'
        r_bold.font.size = Pt(12.5)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
    r_text = p.add_run(text)
    r_text.font.name = 'Times New Roman'
    r_text.font.size = Pt(12.5)
    if italic_suffix:
        r_it = p.add_run(italic_suffix)
        r_it.font.name = 'Times New Roman'
        r_it.font.size = Pt(12)
        r_it.font.italic = True
    return p

def add_bullet_item(bold_label, text):
    p = doc.add_paragraph(style='List Bullet')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(3)
    r_bold = p.add_run(bold_label)
    r_bold.font.name = 'Times New Roman'
    r_bold.font.size = Pt(12.5)
    r_bold.font.bold = True
    r_text = p.add_run(text)
    r_text.font.name = 'Times New Roman'
    r_text.font.size = Pt(12.5)

def add_analysis_block(title, muc_dich, loi_ich, uu_diem, mat_trai, de_xuat):
    """Thêm một khối phân tích 5 tầng chuẩn quốc tế cho từng cấu phần"""
    add_heading_2(title)
    add_bullet_item("1. Bản chất & Mục đích (Làm như vậy để làm gì?): ", muc_dich)
    add_bullet_item("2. Lợi ích thực tế (Có lợi ích gì?): ", loi_ich)
    add_bullet_item("3. Ưu điểm vượt trội (Ưu điểm gì?): ", uu_diem)
    add_bullet_item("4. Mặt trái & Thách thức tiềm ẩn (Mặt trái gì?): ", mat_trai)
    add_bullet_item("5. Đề xuất phương án thay thế & Kế hoạch dự phòng: ", de_xuat)

# ==================== NỘI DUNG TÀI LIỆU ====================

add_doc_title("BÁO CÁO TOÀN DIỆN KIẾN TRÚC HỆ THỐNG VẬN HÀNH & KINH TẾ HỌC NỀN TẢNG THỜI TRANG TUẦN HOÀN CLOOP")
add_doc_subtitle("Tài liệu Kỹ thuật, Luận giải Kiến trúc & Chiến lược Quản trị Rủi ro Thẩm định Techfest\nPhiên bản 3.5 Enterprise • Cập nhật: Tháng 09/2026 • Trạng thái: Live Production")

# Lời dẫn
add_body_p(
    "Báo cáo này trình bày chi tiết toàn bộ kiến trúc hạ tầng công nghệ thời gian thực, mô hình dòng tiền điều phối thanh toán (Orchestration Layer), thuật toán logistics san sẻ 50/50, hệ thống CLOOP Trust Stack, bộ tính điểm rủi ro ngầm (Silent Risk Engine), trần kiểm soát rủi ro (Transaction Exposure Limit) và bài toán kinh tế học tuần hoàn của nền tảng CLOOP. "
    "Tài liệu áp dụng phương pháp luận Đánh giá Kiến trúc và Đánh đổi Chiến lược (Architecture Trade-off & Strategic Evaluation Framework), bóc tách từng quyết định công nghệ và chính sách vận hành theo 5 tầng phân tích: "
    "Mục đích thiết kế, Lợi ích thực tế, Ưu điểm vượt trội, Mặt trái/Thách thức tiềm ẩn, và Phương án thay thế dự phòng, đồng thời tuân thủ nghiêm ngặt Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP."
)

# ==================== CHUYÊN ĐỀ I ====================
add_heading_1("I. KIẾN TRÚC HỆ THỐNG THỜI GIAN THỰC (REAL-TIME ARCHITECTURE)")
add_body_p(
    "Nền tảng CLOOP vận hành trên mô hình API-First kết hợp Serverless Microservices. Toàn bộ các tương tác từ định tuyến logistics, dòng tiền thanh toán đến phân bổ dữ liệu được thiết kế theo nguyên lý Tự Động Hóa Tối Đa và Phục Hồi Duyên Dáng (Graceful Degradation)."
)

# 1. GHN
add_analysis_block(
    "1. Tích hợp Logistics Động (GHN Gateway API - online-gateway.ghn.vn)",
    "Hệ thống kết nối trực tiếp với máy chủ Giao Hàng Nhanh thông qua Token và ShopID chuyên biệt. Khi khách hàng nhập địa chỉ nhận hàng, API tự động đối soát tọa độ bưu cục hành chính, tính toán khoảng cách thực tế giữa Tủ đồ (Người gửi) và Khách thuê (Người nhận), đo lường trọng lượng trang phục và áp bảng cước thời gian thực.",
    "Khách hàng biết rõ phí giao hàng dự kiến trước khi thanh toán, giảm thiểu tối đa tình trạng sai lệch cước vận chuyển. Chủ tủ không cần tự liên hệ bưu tá hay ghi phiếu gửi thủ công; mã vận đơn (Tracking Code) tự động được cấp phát và đồng bộ trực tiếp vào giao diện quản trị đơn.",
    "Độ phủ rộng khắp 63 tỉnh thành đến tận cấp xã/phường; cơ chế Webhook hai chiều tự động kích hoạt cập nhật trạng thái đơn theo vòng đời giao hàng mà không cần bưu tá hay người dùng bấm tay.",
    "Phụ thuộc vào mức độ khả dụng (Uptime) của máy chủ GHN. Nếu API bên thứ 3 bảo trì hoặc quá tải, luồng thanh toán có thể bị chậm trễ ở bước tính phí ship. Ngoài ra, người dùng nhập sai định dạng địa chỉ có thể khiến API trả về mã lỗi không tìm thấy bưu cục.",
    "Chiến lược Multi-Carrier Failover: Tích hợp thêm Giao Hàng Tiết Kiệm (GHTK) hoặc Viettel Post làm đối tác dự phòng (Fallback Provider). Khi hệ thống phát hiện GHN phản hồi quá 3 giây, thuật toán tự động chuyển hướng tính cước sang GHTK. Đối với các đơn tiệc cưới gấp nội thành (dưới 15km), bổ sung lựa chọn giao siêu tốc qua Ahamove/GrabExpress."
)

# 2. PayOS Escrow
add_analysis_block(
    "2. Cổng Thanh Toán Trực Tuyến & Lớp Điều Phối Dòng Tiền (CLOOP Payment Orchestration Layer)",
    "Mỗi giao dịch thuê phát sinh một mã QR động (VietQR NAPAS247 qua cổng PayOS) mã hóa chính xác số tiền cần thanh toán lẻ đến từng đồng và kèm mã định danh giao dịch độc nhất. CLOOP đóng vai trò là Lớp Điều Phối Trạng Thái Giao Dịch (Orchestration Layer), kết nối trực tiếp với Cổng Thanh Toán và Ngân Hàng đối tác để phong tỏa số tiền (Tiền thuê + Cọc đồ + Ship đi) và chỉ kích hoạt lệnh giải ngân cho Chủ tủ sau khi hoàn tất chu kỳ nghiệm thu hợp lệ.",
    "Tạo niềm tin vững chắc cho cả hai phía: Khách thuê không sợ chủ tủ chiếm giữ tiền cọc bất hợp lý; Chủ tủ hoàn toàn an tâm gửi trang phục có giá trị cao vì toàn bộ giá trị đã được phong tỏa bảo chứng trong hệ thống thanh toán.",
    "Chi phí vận hành giao dịch cực thấp (gần như 0đ qua cổng thanh toán chuyển khoản NAPAS247 so với mức phí 2.5% - 3.5% của thẻ tín dụng quốc tế Visa/Mastercard); tốc độ xác nhận biến động số dư qua Webhook diễn ra gần như tức thì (dưới 2 giây).",
    "Khách hàng cần có tài khoản ngân hàng nội địa Việt Nam và sử dụng ứng dụng Mobile Banking. Nếu người dùng quét mã xong nhưng tự ý sửa số tiền hoặc nhập sai nội dung chuyển khoản thủ công, hệ thống phải kích hoạt cơ chế đối soát ngoại lệ (Exception Handling) qua Admin.",
    "Mở rộng cổng thanh toán đa kênh (Omni-channel Payments): Tích hợp bổ sung cổng Stripe / VNPay cho thẻ tín dụng quốc tế để phục vụ kiều bào hoặc khách du lịch nước ngoài thuê áo dài; bổ sung Ví điện tử MoMo / Apple Pay để tối ưu trải nghiệm thanh toán 1-chạm (1-click checkout) trên di động."
)

# 3. Supabase Locking
add_analysis_block(
    "3. Quản Trị Cơ Sở Dữ Liệu & Khóa Bi Quan (PostgreSQL / Supabase Pessimistic Locking)",
    "Hệ thống sử dụng cơ chế Khóa bi quan ở cấp độ hàng (Row-Level Locking với câu lệnh SELECT ... FOR UPDATE) trong quá trình xử lý đơn hàng và lịch thuê. Khi một khách hàng đang trong tiến trình thanh toán thuê chiếc váy vào một khoảng thời gian xác định, bản ghi sản phẩm và khoảng lịch đó lập tức bị khóa tạm thời đối với tất cả người dùng khác.",
    "Giảm thiểu tối đa rủi ro tranh chấp dữ liệu (Race Conditions) và loại bỏ nguy cơ trùng lịch thuê (Double-booking) – bài toán cốt lõi của các sàn cho thuê đồ P2P khi 2 người cùng bấm đặt 1 chiếc đầm duy nhất cho cùng một ngày dạ tiệc.",
    "Đảm bảo tính toàn vẹn dữ liệu chuẩn ACID ở mức nghiêm ngặt (Strict Consistency), duy trì tính nhất quán của trạng thái lịch hẹn ngay cả trong các khung giờ cao điểm có lượng truy cập tăng vọt.",
    "Khóa bi quan làm giảm nhẹ thông lượng xử lý đồng thời (Concurrency Throughput) tại thời điểm cao điểm. Nếu một phiên giao dịch kéo dài do mạng chậm, các truy vấn đọc/ghi khác cùng bản ghi phải xếp hàng chờ giải phóng khóa.",
    "Khi lượng truy cập vượt ngưỡng 100.000 đơn/ngày, chuyển đổi sang cơ chế Khóa lạc quan (Optimistic Locking) kết hợp Khóa phân tán bằng Redis (Redlock Distributed Locks) với thời gian chờ giải phóng cực ngắn (TTL 30 giây)."
)

# 4. Cloudinary CDN
add_analysis_block(
    "4. Phân Phối & Tối Ưu Hóa Hình Ảnh (Cloudinary CDN & Next.js Image Engine)",
    "Toàn bộ hình ảnh lookbook và ảnh trang phục người dùng tải lên được truyền qua bộ lọc chuyển đổi của Cloudinary CDN. Hệ thống tự động nhận diện thiết bị của người dùng để nén định dạng ảnh sang WebP hoặc AVIF hiện đại, tự động căn chỉnh kích thước (resizing) và tối ưu độ phân giải mà không làm giảm chất lượng thị giác.",
    "Tốc độ tải trang sản phẩm đạt chuẩn cao cấp; giảm đến 70% dung lượng băng thông tiêu thụ trên mạng di động 4G/5G của khách hàng; tối ưu hóa các chỉ số trải nghiệm Google Core Web Vitals (LCP, CLS).",
    "Mạng lưới CDN toàn cầu với hàng trăm điểm biên (Edge nodes), hỗ trợ tự động nhận diện khuôn mặt và cắt khung hình thông minh (Smart AI Cropping) làm nổi bật form dáng trang phục.",
    "Nếu lượng ảnh tải lên tăng đột biến vượt hạn ngạch gói dịch vụ miễn phí/tiêu chuẩn của Cloudinary, chi phí lưu trữ và băng thông API có thể tăng theo cấp số nhân.",
    "Xây dựng hạ tầng Hybrid Storage: Sử dụng Cloudflare Images với chi phí cố định cực rẻ (5$ cho 100.000 ảnh) hoặc tự triển khai máy chủ lưu trữ MinIO trên hạ tầng đám mây kết hợp thư viện xử lý ảnh Sharp chạy trên Docker Worker."
)

# 5. Gemini 6-Key Pool
add_analysis_block(
    "5. Cụm Trí Tuệ Nhân Tạo Xoay Vòng 6 Khóa (Gemini 1.5 Pro Rotation Pool)",
    "Hệ thống tích hợp thuật toán xoay vòng khóa API (Round-robin Token Rotation) trên cụm 6 tài khoản Gemini 1.5 Pro. Trí tuệ nhân tạo đảm nhiệm 2 nhiệm vụ cốt lõi: (1) AI Stylist tư vấn phối đồ cá nhân hóa dựa trên dáng người và bối cảnh sự kiện; (2) Tự động trích xuất đặc trưng trang phục (màu sắc, chất liệu, độ dài, phong cách) khi chủ tủ tải ảnh lên.",
    "Chủ tủ không cần tốn thời gian gõ mô tả sản phẩm; khách hàng có một chuyên gia thời trang ảo túc trực 24/7. Nâng cao tỷ lệ chuyển đổi mua/thuê hàng (CRO) và tăng thời gian tương tác trung bình của người dùng trên trang.",
    "Đạt công suất thiết kế lên tới 9.000 requests/ngày mà hoàn toàn không phát sinh chi phí bản quyền AI trong giai đoạn tiền thương mại hóa của Techfest; tự động vượt rào cản Rate Limit (RPM/RPD) thông qua thuật toán ngắt mạch tự phục hồi (Circuit Breaker).",
    "Phụ thuộc vào các tài khoản API cá nhân. Nếu Google siết chặt hạn ngạch hoặc thay đổi chính sách sử dụng đối với model Gemini 1.5 Pro, hệ thống có thể bị gián đoạn tính năng AI nếu không kịp thời ứng biến.",
    "Kế hoạch nâng cấp Enterprise: Đăng ký gói tài trợ khởi nghiệp Google for Startups Cloud Program để chuyển đổi cụm AI sang Google Cloud Vertex AI chính thức với SLA 99.99%. Đồng thời, chuẩn bị sẵn giải pháp mã nguồn mở chạy dự phòng: mô hình Llama-3-Vision hoặc Qwen-VL tự host trên GPU server độc lập."
)

# 6. Google One 10TB
add_analysis_block(
    "6. Kho Lưu Trữ Đối Soát Tranh Chấp 10TB (Google One Dual Pool AppScript Gateway)",
    "Xây dựng cổng truyền dữ liệu trung gian qua Google Apps Script kết nối trực tiếp vào 2 tài khoản lưu trữ Google One Pro (tổng dung lượng 10TB). Chuyên trách tiếp nhận các tập tin video dung lượng lớn (video quay cận cảnh trang phục trước khi đóng gói niêm phong và video mở hộp unboxing của khách thuê) phục vụ đối soát tranh chấp.",
    "Lưu trữ được hàng chục nghìn video kiểm định độ phân giải cao mà không làm tiêu hao dung lượng đắt đỏ của cơ sở dữ liệu chính (Supabase) hay kho ảnh (Cloudinary); tạo bằng chứng khách quan giải quyết khiếu nại.",
    "Dung lượng lưu trữ lên tới 10TB với chi phí tối ưu trong giai đoạn khởi nghiệp, không bị bóp băng thông bởi các nhà cung cấp hosting web thông thường.",
    "Google Apps Script có giới hạn thời gian thực thi (Execution Timeout 6 phút/request) và giới hạn kích thước gói tin HTTP POST (tối đa 50MB/lần gửi). Tốc độ tải video phụ thuộc vào kết nối máy chủ Google Drive.",
    "Chuyển dịch sang dịch vụ lưu trữ lạnh chuyên nghiệp: AWS S3 Glacier Deep Archive hoặc Cloudflare R2 (không tính phí băng thông tải ra - Zero Egress Fee) với chi phí chỉ khoảng 0.00099$/GB/tháng, đảm bảo lưu trữ an toàn hồ sơ tranh chấp theo thời hạn quy định."
)

# ==================== CHUYÊN ĐỀ II ====================
add_heading_1("II. THUẬT TOÁN LOGISTICS SAN SẺ 50/50 & ĐỆM RỦI RO BLOCK 5K")
add_body_p(
    "Một trong những rào cản lớn nhất khiến mô hình cho thuê thời trang thất bại là chi phí vận chuyển 2 chiều (Lượt đi: Tủ đồ -> Khách; Lượt về: Khách -> Tủ đồ). Nếu bắt Khách thuê gánh trọn cả 2 đầu ship (~50.000đ - 70.000đ), tỷ lệ bỏ giỏ hàng (Cart Abandonment) sẽ vượt quá 65%. Ngược lại, nếu bắt Chủ tủ chịu toàn bộ, họ sẽ không còn động lực chia sẻ đồ vì biên lợi nhuận bị bào mòn."
)

add_analysis_block(
    "Cơ Chế San Sẻ Logistics 50/50 Kết Hợp Thuật Toán Làm Tròn Block 5K",
    "CLOOP áp dụng thuật toán chia đôi cước vận chuyển chuẩn hóa: Khách thuê thanh toán trước 25.000đ cho lượt đi ngay lúc tạo đơn; Chủ tủ khấu trừ 25.000đ cho lượt về từ doanh thu cho thuê trước khi giải ngân. Mọi mức cước thực tế từ API GHN đều được làm tròn trần (Ceil) lên mốc 5.000đ gần nhất theo công thức: Cước niêm yết = ⌈ Cước thực tế / 5.000 ⌉ × 5.000.",
    "Hạ thấp rào cản tâm lý cho khách thuê (chỉ thấy phí ship 25k như mua hàng thông thường); Chủ tủ thoải mái vì chi phí lượt về được khấu trừ tự động từ doanh thu chứ không phải bỏ tiền túi trước. Phần chênh lệch làm tròn tạo ra dòng thặng dư dương (+4.000đ đến +8.000đ mỗi đơn hàng) tích lũy trực tiếp vào Quỹ Phòng Vệ Rủi Ro Vận Chuyển của sàn.",
    "Tạo cơ chế tự bù đắp rủi ro vận hành (Self-Insured Logistics Pool): Giảm thiểu nguy cơ sàn bị âm vốn vận chuyển khi bưu tá phụ thu phụ phí giao lại lần 2 hoặc hàng hóa cần chuyển hoàn.",
    "Nếu khách thuê ở các khu vực biển đảo, vùng sâu vùng xa (nơi cước thực tế của GHN vượt quá 50.000đ), phần trợ giá của sàn có thể làm hao hụt Quỹ phòng vệ nếu không có thuật toán giới hạn bán kính vận chuyển.",
    "1. Thuật toán Geofencing: Tự động phát hiện các đơn hàng liên tỉnh có cước vượt quá 45.000đ để áp dụng phụ thu vùng xa minh bạch.\n"
    "2. Hệ thống Trạm Gom Đồ CLOOP Hub: Đặt tủ khóa thông minh (Smart Lockers) tại các tòa nhà văn phòng, trường đại học lớn ở Hà Nội và TP.HCM. Khách hàng và chủ tủ có thể tự gửi/lấy đồ với cước phí 0đ, triệt tiêu 100% chi phí bưu tá."
)

# Bảng minh họa Block 5K
table_block5k = doc.add_table(rows=5, cols=5)
table_block5k.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(table_block5k)

headers_b5 = ["Khoảng cách / Vùng giao", "Cước GHN thực", "Cước niêm yết (Block 5K)", "Khách trả (Đi) + Tủ chịu (Về)", "Thặng dư Quỹ dự phòng"]
for i, name in enumerate(headers_b5):
    cell = table_block5k.rows[0].cells[i]
    cell.text = name
    set_cell_background(cell, "E6F4EA")
    set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x0A, 0x25, 0x17)

data_b5 = [
    ["Nội thành (Dưới 5km)", "16.500đ / lượt", "20.000đ / lượt", "25.000đ + 25.000đ = 50.000đ", "+17.000đ / đơn (Tích quỹ)"],
    ["Nội thành tiêu chuẩn", "21.000đ / lượt", "25.000đ / lượt", "25.000đ + 25.000đ = 50.000đ", "+8.000đ / đơn (Chuẩn mực)"],
    ["Ngoại thành / Cận tỉnh", "24.500đ / lượt", "25.000đ / lượt", "25.000đ + 25.000đ = 50.000đ", "+1.000đ / đơn (Hòa vốn)"],
    ["Liên tỉnh cự ly xa", "28.000đ / lượt", "30.000đ / lượt (Phụ thu 5k)", "30.000đ + 25.000đ = 55.000đ", "-1.000đ (Quỹ bù đắp)"]
]

for r_idx, row_data in enumerate(data_b5):
    row_cells = table_block5k.rows[r_idx + 1].cells
    bg = "FFFFFF" if r_idx % 2 == 0 else "F9FBF9"
    for c_idx, val in enumerate(row_data):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg)
        set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=100, right=100)
        p = row_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(10.5)

# ==================== CHUYÊN ĐỀ III ====================
add_heading_1("III. MA TRẬN DÒNG TIỀN & LỚP ĐIỀU PHỐI THANH TOÁN (ORCHESTRATION LAYER)")
add_body_p(
    "Toàn bộ tài chính của CLOOP tuân thủ nguyên tắc Kế toán Kép (Double-Entry Bookkeeping). Lớp điều phối đóng vai trò trung gian kiểm soát trạng thái giao dịch, kết nối trực tiếp với cổng thanh toán để đảm bảo tính minh bạch."
)

# Bảng Ma trận Dòng tiền
table_flow = doc.add_table(rows=6, cols=5)
table_flow.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(table_flow)

headers_flow = ["Giai đoạn giao dịch", "Ví Khách thuê", "Tài khoản Ký quỹ Đối tác", "Ví Chủ tủ", "Tài khoản Bưu cục GHN"]
for i, name in enumerate(headers_flow):
    cell = table_flow.rows[0].cells[i]
    cell.text = name
    set_cell_background(cell, "E6F4EA")
    set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x0A, 0x25, 0x17)

data_flow = [
    [
        "1. Khách thanh toán VietQR",
        "-1.375.000đ",
        "+1.375.000đ\n(Thuê 350k + Cọc 1.000k + Ship 25k)",
        "0đ",
        "0đ"
    ],
    [
        "2. Bưu tá giao đồ (Lượt đi)",
        "0đ",
        "-21.000đ (Trích trả ship)",
        "0đ",
        "+21.000đ"
    ],
    [
        "3. Thu hồi đồ (Lượt về Pre-paid)",
        "0đ",
        "-21.000đ (Trích trả ship)",
        "0đ",
        "+21.000đ"
    ],
    [
        "4. Nghiệm thu Chuẩn (Phí 12%)",
        "+1.000.000đ\n(Hoàn 100% cọc)",
        "-1.000.000đ (Nhả cọc)\n-283.000đ (Payout chủ tủ)\n+42.000đ (Phí sàn CLOOP)\n+8.000đ (Quỹ phòng vệ)",
        "+283.000đ\n(350k - 42k sàn - 25k ship về)",
        "0đ"
    ],
    [
        "4b. Nghiệm thu Founding 100",
        "+1.000.000đ\n(Hoàn 100% cọc)",
        "-1.000.000đ (Nhả cọc)\n-325.000đ (Payout chủ tủ)\n+0đ (Phí sàn 0%)\n+8.000đ (Quỹ phòng vệ)",
        "+325.000đ\n(350k - 0đ sàn - 25k ship về)",
        "0đ"
    ]
]

for r_idx, row_data in enumerate(data_flow):
    row_cells = table_flow.rows[r_idx + 1].cells
    bg = "FFFFFF" if r_idx % 2 == 0 else "F9FBF9"
    for c_idx, val in enumerate(row_data):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg)
        set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=100, right=100)
        p = row_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx in [0, 2, 3] else WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(10.5)

add_analysis_block(
    "Phân Tích Cơ Chế Khóa Tiền & Giải Ngân Sau Nghiệm Thu 24H",
    "Khi khách trả hàng, Chủ tủ có thời hạn 24 giờ để kiểm tra tình trạng váy/áo. Nếu đồ nguyên vẹn hoặc quá 24 giờ mà chủ tủ không phản hồi, hệ thống kích hoạt Server Action tự động: Hoàn trả 100% tiền cọc về tài khoản khách thuê, giải ngân tiền thuê về ví chủ tủ và ghi nhận doanh thu phí dịch vụ vào tài khoản CLOOP.",
    "Bảo vệ người thuê khỏi hành vi cố tình chây ì không trả cọc của chủ tủ; đồng thời cho chủ tủ đủ thời gian kiểm tra kỹ lưỡng các lỗi rách/bẩn tiềm ẩn dưới ánh sáng tự nhiên trước khi tiền cọc được giải phóng.",
    "Tính kỷ luật tài chính cao: Giảm thiểu tối đa nguy cơ thất thoát dòng tiền; dòng tiền của các bên tách bạch độc lập trên sổ cái kế toán.",
    "Thời gian phong tỏa tiền 24H - 48H có thể khiến các chủ tủ cá nhân cảm thấy sốt ruột so với mô hình giao dịch tiền mặt trực tiếp.",
    "1. Tính năng Instant Payout (Giải ngân siêu tốc): Cho phép các Chủ tủ đạt hạng Platinum/Diamond (điểm đánh giá trên 4.9 và trên 50 đơn hoàn tất) nhận tiền ngay trong 60 giây sau khi bưu tá xác nhận nhận hàng, chịu mức phí bảo lãnh 1.5%.\n"
    "2. Ví Tín Dụng Nội Bộ CLOOP Credit: Số dư có thể được chuyển ngay thành điểm tín dụng trên sàn với tỷ lệ tặng thêm 5% để chủ tủ tiếp tục thuê các trang phục khác trên hệ thống."
)

# ==================== CHUYÊN ĐỀ IV ====================
add_heading_1("IV. CƠ CHẾ XỬ LÝ 3 TRƯỜNG HỢP BIÊN (EDGE CASES)")
add_body_p(
    "Hệ thống vận hành được thiết kế với các quy tắc rẽ nhánh tự động (Decision Tree) để bao quát các tình huống biên phát sinh trong thực tế:"
)

add_analysis_block(
    "1. Trường Hợp Khách Hủy Đơn Trước Khi Bàn Giao Bưu Tá GHN",
    "Nếu khách hủy đơn khi trạng thái vẫn là Chờ xác nhận hoặc Đang chuẩn bị (chưa bàn giao cho bưu tá GHN), hệ thống lập tức kích hoạt lệnh hoàn tiền 100% (Tiền thuê + Cọc + 25.000đ cước ship lượt đi) về tài khoản của khách.",
    "Khách hàng hoàn toàn yên tâm khi đặt đơn, giảm bớt tâm lý ngập ngừng sợ mất tiền nếu lịch trình cá nhân đột xuất thay đổi.",
    "Thực hiện hoàn tiền tự động 1-Click thông qua API ngân hàng, không giữ phí phạt vô lý, tạo ấn tượng thương hiệu tận tâm và uy tín.",
    "Chủ tủ có thể đã dành thời gian là ủi trang phục, đóng gói hộp cẩn thận nhưng bị hủy đơn phút chót.",
    "Áp dụng chính sách hủy đơn linh hoạt (Flexible Cancellation Policy): Cho phép hủy miễn phí trong vòng 2 giờ đầu sau khi đặt. Sau 2 giờ, nếu chủ tủ đã bấm 'Đã đóng gói', khách hủy đơn sẽ bị khấu trừ 10% tiền thuê để bồi thường công chuẩn bị cho chủ tủ."
)

add_analysis_block(
    "2. Trường Hợp Khách Hủy Đơn Khi Bưu Tá Đã Tiếp Nhận Kiện Hàng",
    "Nếu khách đơn phương từ chối nhận hàng khi bưu tá GHN đã lấy kiện đồ và đang giao, hệ thống sẽ trích 25.000đ cước ship đi để trả cho bưu tá, đồng thời trích thêm 25.000đ từ tiền cọc của khách để chi trả cước bưu tá chuyển hoàn về tủ đồ của chủ tủ. Số tiền thuê và phần cọc còn lại được hoàn trả cho khách.",
    "Chủ tủ giảm thiểu thiệt hại tài chính; sàn hạn chế tối đa việc phải bỏ tiền túi bù lỗ chi phí vận chuyển 2 chiều cho hành vi bốc đồng của khách.",
    "Quy định phân xử công bằng, rành mạch dựa trên mốc thời gian thực của mã vận đơn GHN.",
    "Khách hàng bị trừ 50.000đ có thể phát sinh tâm lý tiêu cực và phản ánh lên tổng đài hỗ trợ.",
    "Tích hợp tin nhắn cảnh báo tự động qua Zalo ZNS / SMS trước khi bưu tá đến lấy hàng 1 giờ, kèm nút xác nhận 'Tôi chắc chắn nhận đồ' để giảm tỷ lệ từ chối nhận hàng xuống mức tối thiểu."
)

add_analysis_block(
    "3. Tranh Chấp Hư Hỏng / Sai Mẫu & Quy Trình Video Niêm Phong - Mở Hộp",
    "Bắt buộc Chủ tủ quay video/chụp ảnh tình trạng vải và tem niêm phong lúc đóng gói; nhắc nhở Khách thuê quay video mở hộp unboxing. Khi có khiếu nại, toàn bộ tiền cọc bị phong tỏa trong hệ thống và kích hoạt Hội đồng Trọng tài 3 bên (Khách - Chủ tủ - Admin CLOOP) phân xử dựa trên dữ liệu video trên kho đối soát.",
    "Có bằng chứng khách quan để phân định lỗi thuộc về khâu nào (chủ tủ gửi đồ cũ rách, khách làm bẩn trong lúc mặc tiệc, hay bưu tá làm rách hộp trong lúc vận chuyển).",
    "Bảo vệ giá trị tài sản trang phục cao cấp; hạn chế tối đa tình trạng vu khống hoặc tranh chấp không có cơ sở.",
    "Khách hàng có thể cảm thấy phiền phức khi phải quay video mở hộp; phát sinh thời gian nhân sự vận hành kiểm duyệt video đối soát.",
    "1. Gói Bảo Hiểm Vi Mô 'CLOOP Care' (10.000đ/đơn): Bảo hiểm chi trả chi phí giặt hấp hoặc xử lý các vết bẩn thông thường (vết rượu vang, cà phê, son môi) mà không cần giữ cọc hay tranh chấp.\n"
    "2. Cơ Chế Phân Xử Vi Mô Tự Động (Micro-Resolution $\\le 50.000$đ) kết hợp AI Computer Vision: Tự động đền bù lỗi nhỏ và dùng AI so khớp ảnh trước/sau giao hàng."
)

# ==================== CHUYÊN ĐỀ V ====================
add_heading_1("V. MÔ HÌNH KINH TẾ 'FOUNDING 100' & LỘ TRÌNH THƯƠNG MẠI HÓA")
add_body_p(
    "Nhằm phá vỡ nghịch lý 'Con gà - Quả trứng' (Cần người thuê thì phải có nhiều đồ đẹp, muốn có nhiều đồ đẹp thì phải có đông người thuê), CLOOP triển khai chiến lược kinh tế học nền tảng qua 3 giai đoạn:"
)

# Bảng so sánh Founding 100
table_f100 = doc.add_table(rows=4, cols=3)
table_f100.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(table_f100)

headers_f100 = ["Chỉ số kinh tế / Quyền lợi", "Chủ tủ Tiêu chuẩn (Standard Closet)", "Thành viên Founding 100 (VIP Partner)"]
for i, name in enumerate(headers_f100):
    cell = table_f100.rows[0].cells[i]
    cell.text = name
    set_cell_background(cell, "E6F4EA")
    set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x0A, 0x25, 0x17)

data_f100 = [
    ["Phí hoa hồng sàn (Platform Fee)", "12% trên giá trị mỗi lượt thuê", "0% trọn đời (Miễn phí hoàn toàn)"],
    ["Chiết khấu trên đơn 350.000đ", "Khấu trừ 42.000đ vào Quỹ sàn", "Khấu trừ 0đ (Chủ tủ nhận trọn 325.000đ)"],
    ["Hỗ trợ truyền thông & Đẩy Top", "Theo thuật toán xếp hạng chuẩn", "Ưu tiên xuất hiện Banner trang chủ & AI đề xuất"]
]

for r_idx, row_data in enumerate(data_f100):
    row_cells = table_f100.rows[r_idx + 1].cells
    bg = "FFFFFF" if r_idx % 2 == 0 else "F9FBF9"
    for c_idx, val in enumerate(row_data):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg)
        set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=140, right=140)
        p = row_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(11)

add_analysis_block(
    "Chiến Lược Thâm Nhập Thị Trường & Lộ Trình 3 Giai Đoạn",
    "Giai đoạn 1: Miễn phí sàn 0% để tuyển chọn 100 Tủ đồ chất lượng cao (Founding 100) sở hữu từ 10 - 50 mẫu đầm tiệc, váy thiết kế có giá trị cao. Giai đoạn 2: Giúp chủ tủ hình thành thói quen kiếm dòng tiền thụ động đều đặn từ tủ đồ nhàn rỗi. Giai đoạn 3: Bắt đầu áp dụng biểu phí 12% đối với các tủ đồ thông thường để tạo lập dòng doanh thu bền vững.",
    "Tạo lập nguồn cung ban đầu phong phú, đẳng cấp mà không cần sàn phải bỏ vốn tự mua sắm tồn kho (Zero-Inventory Model); tạo hiệu ứng truyền miệng tự nhiên từ chính 100 đối tác VIP đầu tiên.",
    "Chi phí thu hút khách hàng (CAC) giảm mạnh; tỷ lệ gắn kết và giữ chân đối tác (Lender Retention) đạt mức cao do họ cảm thấy được tôn vinh như những người đồng sáng lập.",
    "Sàn chịu mức doanh thu hoa hồng bằng 0 trong 3 - 6 tháng đầu tiên, toàn bộ chi phí vận hành server phải dựa vào nguồn vốn hạt giống hoặc tài trợ cuộc thi.",
    "Mô hình Doanh Thu Đa Tầng (Multi-stream Monetization):\n"
    "1. Dịch vụ Giặt hấp Sinh học Cao cấp: Thu phí dịch vụ làm sạch trang phục bằng công nghệ sinh học trước và sau khi thuê.\n"
    "2. Gói Thuê Bao VIP 'Pro Closet' (99.000đ/tháng): Chủ tủ được giảm phí sàn từ 12% xuống 5%, được tặng lượt đẩy tin Lookbook hàng tuần và bảo hiểm đồ cao cấp."
)

# ==================== CHUYÊN ĐỀ VI ====================
add_heading_1("VI. CƠ CHẾ ĐÁNH GIÁ XÁC THỰC THEO GIAO DỊCH & TOKENOMICS LEAF COINS")
add_body_p(
    "Uy tín (Trust & Safety) là yếu tố sống còn của mô hình kinh tế tuần hoàn P2P. CLOOP áp dụng cơ chế xác thực đánh giá nghiêm ngặt:"
)

add_analysis_block(
    "Cơ Chế Khóa Đánh Giá Xác Thực & Động Lực Học Tokenomics Leaf Coins",
    "Hệ thống khóa chức năng viết đánh giá. Chỉ những tài khoản có đơn hàng thuê thực tế ở trạng thái HOÀN TẤT TRẢ ĐỒ (LENDER_COMPLETED hoặc BORROWER_RETURNED) mới được mở khóa form đánh giá. Khi hoàn tất đánh giá có nội dung và xếp hạng sao thật, hệ thống tự động thưởng +50 Leaf Coins vào ví người dùng và ghi nhật ký vào sổ cái CoinLedgerEntry. Loại bỏ đánh giá ảo hardcode và các hiệu ứng trang trí không phản ánh dữ liệu thật.",
    "Giảm thiểu tối đa vấn nạn đánh giá ảo, tự đặt đơn ảo để tự khen, hoặc đối thủ chơi xấu dội review 1 sao; bảo vệ uy tín chân thực của từng bộ váy; Leaf Coins tạo động lực thôi thúc khách hàng tái thuê đồ nhiều lần.",
    "Xây dựng niềm tin trung thực cho cộng đồng; chỉ số xếp hạng phản ánh đúng chất lượng dịch vụ và độ mới của trang phục thực tế.",
    "Rào cản cao khiến các sản phẩm mới đăng tải sẽ mất nhiều thời gian hơn để tích lũy được những đánh giá đầu tiên.",
    "1. Đánh Giá 2 Chiều Chuẩn Airbnb (Double-Blind Review): Chủ tủ đánh giá Khách thuê (về ý thức giữ gìn đồ, trả đồ đúng hẹn) và Khách đánh giá Chủ tủ (về độ thơm tho, đúng mô tả). Hai bên chỉ nhìn thấy đánh giá của nhau sau khi cả hai đã hoàn thành.\n"
    "2. Huy Hiệu 'Verified Closet': Cử chuyên viên đến thẩm định trực tiếp nguồn gốc và chất lượng 10 mẫu đầu tiên của Tủ đồ để cấp tem chứng nhận uy tín."
)

# ==================== CHUYÊN ĐỀ VII ====================
add_heading_1("VII. KIẾN TRÚC HIỆU NĂNG TỐI ƯU & BỘ NHỚ ĐỆM IN-MEMORY SWR")
add_body_p(
    "Để đảm bảo trải nghiệm mua sắm mượt mà như các ứng dụng bản địa (Native Apps), hạ tầng web Next.js 16 và React 19 được tối ưu hóa ở mức mã nguồn:"
)

add_analysis_block(
    "Kiến Trúc Server-Side Rendering (SSR) Kết Hợp Bộ Nhớ Đệm In-Memory SWR",
    "Chuyển đổi toàn bộ trang chi tiết sản phẩm (/product/[id]) sang Async Server Component. Dữ liệu được nạp trước (Pre-fetched) trực tiếp từ database kết hợp cơ chế ghi nhớ bộ nhớ trong (React Cache & In-Memory SWR) với thời gian làm tươi 60 giây. Toàn bộ file tĩnh và asset được nén tối đa, loại bỏ Sentry sourcemaps và thư viện dư thừa.",
    "Mục tiêu độ trễ phản hồi trang sản phẩm đạt dưới 1000ms trong điều kiện kết nối tiêu chuẩn, tối ưu qua bộ nhớ đệm In-memory Cache; thời gian build toàn bộ ứng dụng trên máy chủ Vercel giảm hơn 50% (từ 32.7s xuống còn 15.9s); dung lượng lưu trữ build artifacts giảm mạnh, triệt tiêu nguy cơ vượt hạn mức lưu trữ Vercel Storage 10GB.",
    "Người dùng xem sản phẩm thấy nội dung hiển thị nhanh chóng, giảm tối đa độ trễ tải trang; tối ưu hóa SEO cho công cụ tìm kiếm Google.",
    "Nếu chủ tủ vừa cập nhật giá thuê hoặc lịch hẹn, người dùng truy cập trong vòng 60 giây có thể vẫn nhìn thấy dữ liệu lưu trong bộ nhớ đệm trước đó.",
    "On-Demand Incremental Static Regeneration (ISR): Tích hợp hàm Server Action Revalidation. Ngay khi chủ tủ bấm 'Lưu thay đổi', hệ thống lập tức gọi revalidatePath('/product/[id]') để xóa bộ nhớ đệm của riêng trang đó, đảm bảo dữ liệu mới nhất được cập nhật tức thì mà không cần nạp lại toàn trang."
)

# ==================== CHUYÊN ĐỀ VIII (NEW CORE) ====================
add_heading_1("VIII. KIẾN TRÚC 'CLOOP TRUST STACK' & PROGRESSIVE RISK ENGINE")
add_body_p(
    "Đây là bước đột phá mang tính bản lề của CLOOP. Thay vì áp dụng cơ chế eKYC nặng nề (bắt chụp CCCD + selfie + giấy viết tay ngay lúc đăng ký - điều vừa gây rớt tỷ lệ chuyển đổi, vừa không chặn được lừa đảo chuyên nghiệp, lại tiềm ẩn rủi ro pháp lý theo Luật Bảo vệ Dữ liệu Cá nhân), CLOOP chuyển dịch sang mô hình 'Trust Stack Tích Lũy Lũy Tiến' và 'Kiểm Soát Trần Thiệt Hại' (Damage Isolation)."
)

add_analysis_block(
    "1. Tầng Account Trust (Quyền Kiểm Soát Tài Khoản) & Identity as a Privilege",
    "Đăng ký ban đầu cực nhẹ qua Supabase Auth: Chỉ cần Email OTP / Magic Link và Số điện thoại. Đây là bước chứng minh quyền kiểm soát tài khoản, không gọi là eKYC. Xác minh danh tính sinh viên (@edu.vn) hay giấy tờ chỉ xuất hiện như một QUYỀN LỢI (Privilege) khi người dùng chủ động muốn 'Giảm tiền cọc' hoặc 'Mở rộng hạn mức thuê đồ cao cấp'.",
    "Giảm thiểu 90% ma sát đăng ký ban đầu cho người dùng trẻ Gen Z; tỷ lệ kích hoạt tài khoản thành công tăng vọt; tôn trọng quyền riêng tư.",
    "Tách bạch rành mạch giữa 'Account Control' và 'Legal Identity'. Email trường đại học chỉ được gắn nhãn 'Student Email Verified', không đánh đồng là định danh pháp lý tuyệt đối.",
    "Tài khoản mới chỉ có mức độ tin cậy cơ bản, chưa đủ điều kiện nhận ưu đãi giảm cọc.",
    "Khuyến khích người dùng liên kết email trường để nhận ngay huy hiệu Sinh viên và giảm 30% cọc cho các đơn dưới 1 triệu."
)

add_analysis_block(
    "2. Dynamic Progressive Trust & Công Thức Cọc Động f(Value, Trust, History)",
    "Loại bỏ quy tắc cứng nhắc 'Đơn 1 cọc 100%, Đơn 2 cọc 50%, Đơn 3 miễn cọc' (vì người uy tín thuê đồ 10 triệu vẫn có rủi ro khác người thuê áo 200k). Áp dụng công thức cọc động: Tiền Cọc = f(Giá Trị Đồ, Trust Score, Lịch Sử Đơn Hoàn Tất, Tín Hiệu Rủi Ro). Điểm Trust Score được tích lũy dần qua hành vi trả đồ đúng hẹn, không tranh chấp.",
    "Tạo động lực mạnh mẽ để người dùng giữ gìn đồ và gắn bó lâu dài với sàn; biến Trust Score thành một loại tài sản uy tín cá nhân của chính người dùng.",
    "Explainable Trust & Gamified UX: Hiển thị minh bạch lý do tiền cọc thay đổi trên giỏ hàng (Ví dụ: 'Bạn được giảm 50% cọc nhờ Trust Score Hạng A; Hoàn tất đơn này đúng hẹn để nâng hạng VIP!').",
    "Người dùng có thể thắc mắc tại sao cùng một chiếc váy nhưng 2 tài khoản lại thấy mức cọc khác nhau nếu giao diện không giải thích rõ ràng.",
    "Gamification giao diện giỏ hàng: Luôn hiển thị dòng chữ giải thích phần tiền cọc được miễn giảm như một 'phần thưởng uy tín' chứ không phải mức giá phân biệt đối xử."
)

add_analysis_block(
    "3. Silent Risk Engine (Bộ Tính Điểm Rủi Ro Ngầm) & Transaction Exposure Limit",
    "Chạy ngầm trong Server Actions để giám sát các tín hiệu bất thường: thiết bị mới, nhiều tài khoản chung 1 thiết bị, tỷ lệ hủy đơn cao, giá trị đơn tăng đột biến. Phân chia người dùng thành 3 luồng rủi ro: Xanh (Bình thường), Vàng (Tăng cọc/Xác minh thêm), Đỏ (Cọc 100% + Trần hạn mức thấp). Đồng thời, áp dụng Hạn mức Tài sản Đang giữ (Exposure Limit) theo cấp độ tín nhiệm.",
    "Thay vì cố gắng 'chặn 100% người xấu' (điều bất khả thi), CLOOP 'giới hạn thiệt hại tối đa' (Damage Isolation) nếu có người xấu vượt qua. Nếu một kẻ gian Level 0 có ý định chiếm đoạt đồ, tài sản tối đa họ có thể tiếp cận chỉ là 1-2 triệu đồng, hoàn toàn nằm trong khả năng hấp thụ của Quỹ phòng vệ rủi ro.",
    "Friction thông minh: 99% người dùng chân chính không cảm thấy bất kỳ phiền toái nào, hệ thống chỉ kích hoạt phòng thủ khi phát hiện dấu hiệu bất thường.",
    "Khách hàng mới có nhu cầu thuê đồ dạ hội đắt tiền ngay lần đầu có thể gặp rào cản hạn mức (The Whale Problem).",
    "Cơ chế Fast-Track Trust cho khách VIP: Cho phép khách mới thuê đồ giá trị cao nếu tự nguyện cấp bảo lãnh mạnh: (A) Pre-Authorization phong tỏa tạm thời trên thẻ tín dụng quốc tế (không trừ tiền thật) hoặc (B) Đặt cọc 100% tiền mặt qua VietQR (hoàn ngay sau khi trả đồ)."
)

add_analysis_block(
    "4. Digital Evidence Timeline & Cơ Chế Phân Xử Vi Mô (Micro-Resolution <= 50.000đ)",
    "Chuỗi chứng cứ số có dấu thời gian (Timestamped Evidence Timeline): Ghi nhận tuần tự từ lúc Chủ tủ chụp ảnh niêm phong -> Bưu tá GHN quét mã -> Khách quay unboxing -> Khách trả đồ -> Chủ tủ nghiệm thu. Đặc biệt, bổ sung cơ chế Phân Xử Vi Mô: Nếu tranh chấp phát sinh có giá trị thiệt hại nhỏ (<= 50.000đ như sứt chỉ, vết bẩn nhỏ), hệ thống tự động trích Quỹ phòng vệ đền bù đóng đơn trong 5 giây mà không cần gọi Admin.",
    "Giải quyết triệt để bài toán thắt cổ chai chi phí vận hành (OPEX Admin Bottleneck). Khi sàn mở rộng lên hàng nghìn đơn/ngày, chi phí nhân sự ngồi soi video 15 phút (tốn ~40.000đ) đắt hơn việc trích quỹ đền bù 30.000đ. Giúp cả Khách thuê và Chủ tủ đều được xử lý hài lòng tức thì.",
    "Toàn bộ tranh chấp lớn (trên 50.000đ) được Admin phân xử chuẩn xác chỉ bằng việc mở 1 màn hình Timeline trực quan, không phải tìm kiếm tập tin rời rạc.",
    "Nguy cơ lạm dụng cơ chế Micro-Resolution nếu một chủ tủ cố tình liên tục báo lỗi nhỏ để nhận tiền đền bù vi mô.",
    "Thuật toán giới hạn tần suất đền bù vi mô (Micro-Resolution Frequency Capping): Mỗi chủ tủ chỉ được áp dụng cơ chế tự động tối đa 2 lần/tháng. Vượt quá hạn mức này, toàn bộ đơn hàng bắt buộc chuyển sang quy trình kiểm duyệt có đối soát video."
)

# ==================== CHUYÊN ĐỀ IX (LEGAL DATA PRIVACY) ====================
add_heading_1("IX. KHUNG BẢO VỆ DỮ LIỆU CÁ NHÂN (LUẬT 91/2025/QH15 & NĐ 356/2025/NĐ-CP)")
add_body_p(
    "Nhận thức rõ trách nhiệm pháp lý khi Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP chính thức có hiệu lực từ ngày 01/01/2026, CLOOP áp dụng triệt để nguyên lý 'Privacy by Design' và 'Collect less -> Verify smarter'. Hệ thống phân loại dữ liệu thành 5 cấp độ nghiêm ngặt:"
)

# Bảng phân loại dữ liệu
table_data_priv = doc.add_table(rows=6, cols=5)
table_data_priv.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(table_data_priv)

headers_priv = ["Cấp độ dữ liệu", "Dữ liệu cụ thể", "Mục đích sử dụng", "Cơ chế bảo vệ & Phân quyền", "Thời hạn lưu trữ & Hủy"]
for i, name in enumerate(headers_priv):
    cell = table_data_priv.rows[0].cells[i]
    cell.text = name
    set_cell_background(cell, "E6F4EA")
    set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x0A, 0x25, 0x17)

data_priv = [
    [
        "1. Public Data",
        "Tên hiển thị, avatar, review, tủ đồ công khai",
        "Hiển thị storefront, gợi ý lookbook",
        "Công khai toàn hệ thống",
        "Lưu theo vòng đời tài khoản"
    ],
    [
        "2. Account Data",
        "Email đăng ký, số điện thoại",
        "Đăng nhập, thông báo trạng thái đơn",
        "Mã hóa AES-256, chỉ Admin CSKH được truy cập theo phiên",
        "Xóa sau 30 ngày kể từ khi hủy tài khoản"
    ],
    [
        "3. Transaction Data",
        "Lịch sử đơn, mã vận đơn GHN, biến động số dư ví",
        "Kế toán, đối soát, kiểm toán tài chính",
        "Phân quyền RBAC nghiêm ngặt, lưu audit log truy vết",
        "Lưu trữ 5 năm theo Luật Kế toán Việt Nam"
    ],
    [
        "4. Sensitive Identity",
        "Email trường @edu.vn, thông tin định danh",
        "Xét duyệt hạn mức thuê và quyền lợi giảm cọc",
        "Che mờ (Masking), mã hóa cấp cơ sở dữ liệu, không lưu CCCD thô",
        "Hủy sau khi hết chu kỳ xác thực (1 năm)"
    ],
    [
        "5. Evidence Media",
        "Video niêm phong đóng gói, video unboxing mở hộp",
        "Đối soát khiếu nại tranh chấp khi phát sinh sự cố",
        "Lưu trữ phân vùng bảo mật riêng (Cold Storage), cấp link có hạn giờ",
        "Tự động xóa vĩnh viễn sau 60 ngày kể từ khi đơn hoàn tất"
    ]
]

for r_idx, row_data in enumerate(data_priv):
    row_cells = table_data_priv.rows[r_idx + 1].cells
    bg = "FFFFFF" if r_idx % 2 == 0 else "F9FBF9"
    for c_idx, val in enumerate(row_data):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg)
        set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=100, right=100)
        p = row_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx in [1, 2, 3] else WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(10.5)

# ==================== CHUYÊN ĐỀ X ====================
add_heading_1("X. BẢNG TỔNG HỢP MA TRẬN QUẢN TRỊ RỦI RO TOÀN DIỆN (RISK MATRIX)")
add_body_p(
    "Dưới đây là bảng tổng hợp các rủi ro chiến lược và giải pháp ứng phó toàn diện của hệ thống CLOOP:"
)

table_risk = doc.add_table(rows=6, cols=4)
table_risk.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(table_risk)

headers_risk = ["Hạng mục rủi ro", "Mức độ rủi ro", "Tác động tiềm ẩn", "Biện pháp kiểm soát & Dự phòng của CLOOP"]
for i, name in enumerate(headers_risk):
    cell = table_risk.rows[0].cells[i]
    cell.text = name
    set_cell_background(cell, "E6F4EA")
    set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x0A, 0x25, 0x17)

data_risk = [
    [
        "Gián đoạn cổng API Logistics (GHN bảo trì)",
        "Trung bình",
        "Kẹt luồng thanh toán đơn hàng do không tính được phí ship",
        "Kích hoạt cơ chế Multi-Carrier Failover tự động chuyển sang bưu tá dự phòng GHTK / Viettel Post trong 3 giây."
    ],
    [
        "Khách không trả đồ / Chiếm đoạt trang phục",
        "Thấp",
        "Thất thoát tài sản của Chủ tủ, gây mất niềm tin sàn",
        "Nguyên lý Damage Isolation: Áp trần Transaction Exposure Limit (1-2 triệu cho user mới); Cọc bảo chứng qua ngân hàng; luồng Fast-Track cho khách VIP."
    ],
    [
        "Đụng lịch thuê đồng thời (Double-booking)",
        "Cao",
        "2 khách cùng thuê 1 váy cùng ngày, gây vỡ hợp đồng",
        "Áp dụng khóa bi quan (Pessimistic Row-level Locking) tại tầng cơ sở dữ liệu Supabase, loại bỏ tranh chấp dữ liệu Race Condition."
    ],
    [
        "Gian lận đánh giá / Đánh giá ảo",
        "Trung bình",
        "Làm sai lệch chất lượng thực tế của trang phục",
        "Kiểm duyệt 2 tầng: Chỉ tài khoản hoàn tất đơn hàng thuê mới được mở quyền đánh giá; thưởng Leaf Coins minh bạch."
    ],
    [
        "Thắt cổ chai chi phí vận hành Admin khi tranh chấp",
        "Trung bình",
        "Đội chi phí nhân sự ngồi xem video đối soát khi sàn tăng trưởng",
        "Triển khai cơ chế Phân Xử Vi Mô (Micro-Resolution <= 50.000đ): Trích Quỹ phòng vệ đền bù tự động trong 5 giây cho các lỗi nhỏ."
    ]
]

for r_idx, row_data in enumerate(data_risk):
    row_cells = table_risk.rows[r_idx + 1].cells
    bg = "FFFFFF" if r_idx % 2 == 0 else "F9FBF9"
    for c_idx, val in enumerate(row_data):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg)
        set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=100, right=100)
        p = row_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(10.5)

# ==================== CHUYÊN ĐỀ XI (ROADMAP) ====================
add_heading_1("XI. LỘ TRÌNH TRIỂN KHAI 3 GIAI ĐOẠN (MVP -> GROWTH -> SCALE)")
add_body_p(
    "Để đảm bảo tính khả thi tài chính và sự thực dụng trong vận hành, hệ thống an toàn và niềm tin của CLOOP được phân kỳ theo 3 giai đoạn:"
)

add_bullet_item("1. Giai đoạn MVP Techfest (2026 - 2027): ", "Account Trust (Email/Phone OTP) + Trust Score cơ bản + Trần Exposure Limit 2 triệu + Cọc bảo chứng đơn đầu + Digital Evidence Timeline + Cơ chế Phân xử vi mô <= 50.000đ. Chi phí công nghệ eKYC: 0 đồng.")
add_bullet_item("2. Giai đoạn Tăng Trưởng - Growth (2028): ", "Mở rộng xác thực Email sinh viên @edu.vn + Silent Risk Engine chấm điểm tự động theo hành vi máy tính và mạng viễn thông + Gamified Trust UX trực quan trên giỏ hàng + Multi-carrier Logistics Failover.")
add_bullet_item("3. Giai đoạn Mở Rộng Quy Mô - Scale Enterprise (2029+): ", "Tích hợp đối tác eKYC chuyên dụng (Face Match & Liveness Detection) cho các giao dịch trang phục kim cương/hàng hiệu; ứng dụng AI Computer Vision tự động so khớp ảnh trước/sau giao đồ; gói bảo hiểm vi mô P2P liên kết công ty bảo hiểm.")

# Kết luận
p_end = doc.add_paragraph()
p_end.paragraph_format.space_before = Pt(14)
p_end.paragraph_format.space_after = Pt(14)
p_end.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_end = p_end.add_run(
    "KẾT LUẬN: Bản báo cáo này khẳng định CLOOP đã hoàn thiện một bước tiến vượt bậc về tư duy thiết kế hệ thống. "
    "Bằng cách kết hợp giữa Khung Quản Trị Rủi Ro Lũy Tiến (Progressive Trust Stack), Cơ Chế Cách Ly Thiệt Hại (Damage Isolation qua Exposure Limit), Phân Xử Vi Mô (Micro-Resolution) và Khung Bảo Vệ Dữ Liệu Cá Nhân chuẩn Luật 91/2025/QH15, "
    "CLOOP chứng minh năng lực sẵn sàng bảo vệ thành công trước các Hội Đồng Giám Khảo khó tính nhất của Techfest và vững vàng bước vào giai đoạn thương mại hóa quy mô lớn."
)
r_end.font.name = 'Times New Roman'
r_end.font.size = Pt(12.5)
r_end.font.italic = True
r_end.font.bold = True
r_end.font.color.rgb = RGBColor(0x0F, 0x4A, 0x34)

# Lưu file vào 2 vị trí: Thư mục dự án và Thư mục Downloads của máy sếp
project_path = r"c:\Users\Yoga gen 3\Downloads\CLOOP_Techfest\cloop-app\BAO_CAO_KIEN_TRUC_VAN_HANH_CLOOP.docx"
downloads_path = r"c:\Users\Yoga gen 3\Downloads\BAO_CAO_KIEN_TRUC_VAN_HANH_CLOOP.docx"

doc.save(project_path)
print("SUCCESS: Saved report to " + project_path)

try:
    doc.save(downloads_path)
    print("SUCCESS: Updated report in " + downloads_path)
except PermissionError:
    alt_downloads_path = r"c:\Users\Yoga gen 3\Downloads\BAO_CAO_KIEN_TRUC_VAN_HANH_CLOOP_CHUYEN_SAU.docx"
    doc.save(alt_downloads_path)
    print("NOTICE: Saved as alternative because original file is open in Word: " + alt_downloads_path)
