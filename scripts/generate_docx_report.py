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
    add_heading_2(title)
    add_bullet_item("1. Bản chất & Mục đích: ", muc_dich)
    add_bullet_item("2. Lợi ích thực tế: ", loi_ich)
    add_bullet_item("3. Ưu điểm vượt trội: ", uu_diem)
    add_bullet_item("4. Mặt trái & Thách thức tiềm ẩn: ", mat_trai)
    add_bullet_item("5. Đề xuất phương án thay thế & Kế hoạch dự phòng: ", de_xuat)

# ==================== NỘI DUNG TÀI LIỆU ====================

add_doc_title("BÁO CÁO TOÀN DIỆN KIẾN TRÚC HỆ THỐNG VẬN HÀNH & KINH TẾ HỌC NỀN TẢNG THỜI TRANG TUẦN HOÀN CLOOP")
add_doc_subtitle("Tài liệu Kỹ thuật, Luận giải Kiến trúc, Digital Damage Protocol & Chiến lược Quản trị Rủi ro Thẩm định Techfest\nPhiên bản 4.0 Enterprise • Cập nhật: Tháng 09/2026 • Trạng thái: Live Production")

add_body_p(
    "Tài liệu này trình bày chi tiết toàn bộ kiến trúc hạ tầng công nghệ thời gian thực, mô hình điều phối thanh toán (Payment Orchestration Layer), quy chuẩn xử lý hư hỏng (Digital Damage Protocol), giải mã 4 Tử huyệt ngành cho thuê thời trang, bộ đối thoại 7 câu hỏi tử thần của Quỹ đầu tư mạo hiểm (VC), hệ thống CLOOP Trust Stack, trần rủi ro tài sản (Transaction Exposure Limit) và bài toán kinh tế học tuần hoàn của nền tảng CLOOP. "
    "Tài liệu áp dụng phương pháp luận Đánh giá Kiến trúc và Đánh đổi Chiến lược 5 Tầng, tuân thủ nghiêm ngặt Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15, Nghị định 356/2025/NĐ-CP và Nghị định 52/2024/NĐ-CP về thanh toán không dùng tiền mặt."
)

# ==================== CHUYÊN ĐỀ I ====================
add_heading_1("I. KIẾN TRÚC HỆ THỐNG THỜI GIAN THỰC (REAL-TIME ARCHITECTURE)")
add_body_p(
    "Nền tảng CLOOP vận hành trên mô hình API-First kết hợp Serverless Microservices. Toàn bộ các tương tác từ định tuyến logistics, dòng tiền thanh toán đến phân bổ dữ liệu được thiết kế theo nguyên lý Tự Động Hóa Tối Đa và Phục Hồi Duyên Dáng (Graceful Degradation)."
)

add_analysis_block(
    "1. Tích hợp Logistics Động (GHN Gateway API - online-gateway.ghn.vn)",
    "Hệ thống kết nối trực tiếp với máy chủ Giao Hàng Nhanh thông qua Token và ShopID chuyên biệt. Khi khách hàng nhập địa chỉ nhận hàng, API tự động đối soát tọa độ bưu cục hành chính, tính toán khoảng cách thực tế giữa Tủ đồ (Người gửi) và Khách thuê (Người nhận), đo lường trọng lượng trang phục và áp bảng cước thời gian thực.",
    "Khách hàng biết rõ phí giao hàng dự kiến trước khi thanh toán, giảm thiểu tối đa tình trạng sai lệch cước vận chuyển. Chủ tủ không cần tự liên hệ bưu tá hay ghi phiếu gửi thủ công; mã vận đơn (Tracking Code) tự động được cấp phát và đồng bộ trực tiếp vào giao diện quản trị đơn.",
    "Độ phủ rộng khắp 63 tỉnh thành đến tận cấp xã/phường; cơ chế Webhook hai chiều tự động kích hoạt cập nhật trạng thái đơn theo vòng đời giao hàng mà không cần bưu tá hay người dùng bấm tay.",
    "Phụ thuộc vào mức độ khả dụng (Uptime) của máy chủ GHN. Nếu API bên thứ 3 bảo trì hoặc quá tải, luồng thanh toán có thể bị chậm trễ ở bước tính phí ship. Ngoài ra, người dùng nhập sai định dạng địa chỉ có thể khiến API trả về mã lỗi không tìm thấy bưu cục.",
    "Chiến lược Multi-Carrier Failover: Tích hợp thêm Giao Hàng Tiết Kiệm (GHTK) hoặc Viettel Post làm đối tác dự phòng (Fallback Provider). Khi hệ thống phát hiện GHN phản hồi quá 3 giây, thuật toán tự động chuyển hướng tính cước sang GHTK. Đối với các đơn tiệc cưới gấp nội thành (dưới 15km), bổ sung lựa chọn giao siêu tốc qua Ahamove/GrabExpress."
)

add_analysis_block(
    "2. Cổng Thanh Toán Trực Tuyến & Lớp Điều Phối Dòng Tiền (CLOOP Payment Orchestration Layer)",
    "Mỗi giao dịch thuê phát sinh một mã QR động (VietQR NAPAS247 qua cổng PayOS) mã hóa chính xác số tiền cần thanh toán lẻ đến từng đồng và kèm mã định danh giao dịch độc nhất. CLOOP đóng vai trò là Lớp Điều Phối Trạng Thái Giao Dịch (Orchestration Layer), kết nối trực tiếp với Cổng Thanh Toán và Ngân Hàng đối tác để phong tỏa số tiền (Tiền thuê + Cọc đồ + Ship đi) và chỉ kích hoạt lệnh giải ngân cho Chủ tủ sau khi hoàn tất chu kỳ nghiệm thu hợp lệ.",
    "Tạo niềm tin vững chắc cho cả hai phía: Khách thuê không sợ chủ tủ chiếm giữ tiền cọc bất hợp lý; Chủ tủ hoàn toàn an tâm gửi trang phục có giá trị cao vì toàn bộ giá trị đã được phong tỏa bảo chứng trong hệ thống thanh toán.",
    "Chi phí vận hành giao dịch cực thấp (gần như 0đ qua cổng thanh toán chuyển khoản NAPAS247 so với mức phí 2.5% - 3.5% của thẻ tín dụng quốc tế Visa/Mastercard); tốc độ xác nhận biến động số dư qua Webhook diễn ra gần như tức thì (dưới 2 giây).",
    "Khách hàng cần có tài khoản ngân hàng nội địa Việt Nam và sử dụng ứng dụng Mobile Banking. Nếu người dùng quét mã xong nhưng tự ý sửa số tiền hoặc nhập sai nội dung chuyển khoản thủ công, hệ thống phải kích hoạt cơ chế đối soát ngoại lệ (Exception Handling) qua Admin.",
    "Mở rộng cổng thanh toán đa kênh (Omni-channel Payments): Tích hợp bổ sung cổng Stripe / VNPay cho thẻ tín dụng quốc tế để phục vụ kiều bào hoặc khách du lịch nước ngoài thuê áo dài; bổ sung Ví điện tử MoMo / Apple Pay để tối ưu trải nghiệm thanh toán 1-chạm (1-click checkout) trên di động."
)

add_analysis_block(
    "3. Quản Trị Cơ Sở Dữ Liệu & Khóa Bi Quan (PostgreSQL / Supabase Pessimistic Locking)",
    "Hệ thống sử dụng cơ chế Khóa bi quan ở cấp độ hàng (Row-Level Locking với câu lệnh SELECT ... FOR UPDATE) trong quá trình xử lý đơn hàng và lịch thuê. Khi một khách hàng đang trong tiến trình thanh toán thuê chiếc váy vào một khoảng thời gian xác định, bản ghi sản phẩm và khoảng lịch đó lập tức bị khóa tạm thời đối với tất cả người dùng khác.",
    "Giảm thiểu tối đa rủi ro tranh chấp dữ liệu (Race Conditions) và loại bỏ nguy cơ trùng lịch thuê (Double-booking) – bài toán cốt lõi của các sàn cho thuê đồ P2P khi 2 người cùng bấm đặt 1 chiếc đầm duy nhất cho cùng một ngày dạ tiệc.",
    "Đảm bảo tính toàn vẹn dữ liệu chuẩn ACID ở mức nghiêm ngặt (Strict Consistency), duy trì tính nhất quán của trạng thái lịch hẹn ngay cả trong các khung giờ cao điểm có lượng truy cập tăng vọt.",
    "Khóa bi quan làm giảm nhẹ thông lượng xử lý đồng thời (Concurrency Throughput) tại thời điểm cao điểm. Nếu một phiên giao dịch kéo dài do mạng chậm, các truy vấn đọc/ghi khác cùng bản ghi phải xếp hàng chờ giải phóng khóa.",
    "Khi lượng truy cập vượt ngưỡng 100.000 đơn/ngày, chuyển đổi sang cơ chế Khóa lạc quan (Optimistic Locking) kết hợp Khóa phân tán bằng Redis (Redlock Distributed Locks) với thời gian chờ giải phóng cực ngắn (TTL 30 giây)."
)

add_analysis_block(
    "4. Phân Phối & Tối Ưu Hóa Hình Ảnh (Cloudinary CDN & Next.js Image Engine)",
    "Toàn bộ hình ảnh lookbook và ảnh trang phục người dùng tải lên được truyền qua bộ lọc chuyển đổi của Cloudinary CDN. Hệ thống tự động nhận diện thiết bị của người dùng để nén định dạng ảnh sang WebP hoặc AVIF hiện đại, tự động căn chỉnh kích thước (resizing) và tối ưu độ phân giải mà không làm giảm chất lượng thị giác.",
    "Tốc độ tải trang sản phẩm đạt chuẩn cao cấp; giảm đến 70% dung lượng băng thông tiêu thụ trên mạng di động 4G/5G của khách hàng; tối ưu hóa các chỉ số trải nghiệm Google Core Web Vitals (LCP, CLS).",
    "Mạng lưới CDN toàn cầu với hàng trăm điểm biên (Edge nodes), hỗ trợ tự động nhận diện khuôn mặt và cắt khung hình thông minh (Smart AI Cropping) làm nổi bật form dáng trang phục.",
    "Nếu lượng ảnh tải lên tăng đột biến vượt hạn ngạch gói dịch vụ miễn phí/tiêu chuẩn của Cloudinary, chi phí lưu trữ và băng thông API có thể tăng theo cấp số nhân.",
    "Xây dựng hạ tầng Hybrid Storage: Sử dụng Cloudflare Images với chi phí cố định cực rẻ (5$ cho 100.000 ảnh) hoặc tự triển khai máy chủ lưu trữ MinIO trên hạ tầng đám mây kết hợp thư viện xử lý ảnh Sharp chạy trên Docker Worker."
)

add_analysis_block(
    "5. Cụm Trí Tuệ Nhân Tạo Xoay Vòng 6 Khóa (Gemini 1.5 Pro Rotation Pool)",
    "Hệ thống tích hợp thuật toán xoay vòng khóa API (Round-robin Token Rotation) trên cụm 6 tài khoản Gemini 1.5 Pro. Trí tuệ nhân tạo đảm nhiệm 2 nhiệm vụ cốt lõi: (1) AI Stylist tư vấn phối đồ cá nhân hóa dựa trên dáng người và bối cảnh sự kiện; (2) Tự động trích xuất đặc trưng trang phục (màu sắc, chất liệu, độ dài, phong cách) khi chủ tủ tải ảnh lên.",
    "Chủ tủ không cần tốn thời gian gõ mô tả sản phẩm; khách hàng có một chuyên gia thời trang ảo túc trực 24/7. Nâng cao tỷ lệ chuyển đổi mua/thuê hàng (CRO) và tăng thời gian tương tác trung bình của người dùng trên trang.",
    "Đạt công suất thiết kế lên tới 9.000 requests/ngày mà hoàn toàn không phát sinh chi phí bản quyền AI trong giai đoạn tiền thương mại hóa của Techfest; tự động vượt rào cản Rate Limit (RPM/RPD) thông qua thuật toán ngắt mạch tự phục hồi (Circuit Breaker).",
    "Phụ thuộc vào các tài khoản API cá nhân. Nếu Google siết chặt hạn ngạch hoặc thay đổi chính sách sử dụng đối với model Gemini 1.5 Pro, hệ thống có thể bị gián đoạn tính năng AI nếu không kịp thời ứng biến.",
    "Kế hoạch nâng cấp Enterprise: Đăng ký gói tài trợ khởi nghiệp Google for Startups Cloud Program để chuyển đổi cụm AI sang Google Cloud Vertex AI chính thức với SLA 99.99%. Đồng thời, chuẩn bị sẵn giải pháp mã nguồn mở chạy dự phòng: mô hình Llama-3-Vision hoặc Qwen-VL tự host trên GPU server độc lập."
)

add_analysis_block(
    "6. Kho Lưu Trữ Đối Soát Tranh Chấp 10TB (Google One Dual Pool AppScript Gateway)",
    "Xây dựng cổng truyền dữ liệu trung gian qua Google Apps Script kết nối trực tiếp vào 2 tài khoản lưu trữ Google One Pro (tổng dung lượng 10TB). Chuyên trách tiếp nhận các tập tin video dung lượng lớn (video quay cận cảnh trang phục trước khi đóng gói niêm phong và video mở hộp unboxing của khách thuê) phục vụ đối soát tranh chấp.",
    "Lưu trữ được hàng chục nghìn video kiểm định độ phân giải cao mà không làm tiêu hao dung lượng đắt đỏ của cơ sở dữ liệu chính (Supabase) hay kho ảnh (Cloudinary); tạo bằng chứng khách quan giải quyết khiếu nại.",
    "Dung lượng lưu trữ lên tới 10TB với chi phí tối ưu trong giai đoạn khởi nghiệp, không bị bóp băng thông bởi các nhà cung cấp hosting web thông thường.",
    "Google Apps Script có giới hạn thời gian thực thi (Execution Timeout 6 phút/request) và giới hạn kích thước gói tin HTTP POST (tối đa 50MB/lần gửi). Tốc độ tải video phụ thuộc vào kết nối máy chủ Google Drive.",
    "Chuyển dịch sang dịch vụ lưu trữ lạnh chuyên nghiệp: AWS S3 Glacier Deep Archive hoặc Cloudflare R2 (không tính phí băng thông tải ra - Zero Egress Fee) với chi phí chỉ khoảng 0.00099$/GB/tháng, đảm bảo lưu trữ an toàn hồ sơ tranh chấp theo thời hạn quy định."
)

# ==================== CHUYÊN ĐỀ II (4 TỬ HUYỆT) ====================
add_heading_1("II. 4 TỬ HUYỆT CỦA MÔ HÌNH FASHION RENTAL & LỜI GIẢI CỦA CLOOP")
add_body_p(
    "Mô hình cho thuê thời trang P2P từng được coi là 'Nghĩa địa Startup' vì nhiều nền tảng đã đốt hàng triệu USD rồi đóng cửa do vấp phải 4 rào cản chí mạng. Dưới đây là cách CLOOP phá vỡ 4 tử huyệt này:"
)

add_analysis_block(
    "Tử Huyệt 1: Cơn Ác Mộng CSKH & Tỷ Lệ Hoàn Trả 100% (The CS Nightmare)",
    "Thương mại điện tử thông thường chỉ có tỷ lệ trả hàng dưới 10%. Nhưng trong Fashion Rental, tỷ lệ hoàn trả về bản chất là 100%. Mỗi vòng quay đều tiềm ẩn nguy cơ phát sinh xước chỉ, vết bẩn, trễ hạn, đổ lỗi qua lại. Nếu dùng nhân sự CSKH ngồi phân xử thủ công cho từng đơn hàng 200.000đ, chi phí vận hành (OPEX) sẽ bóp nghẹt biên lợi nhuận.",
    "CLOOP số hóa toàn bộ luật chơi: Áp dụng Digital Damage Protocol (3 cấp độ thiệt hại), Digital Evidence Timeline có timestamp, và cơ chế Phân Xử Vi Mô (Micro-Resolution <= 50.000đ) tự động giải quyết các lỗi nhỏ trong 5 giây mà không cần con người can thiệp.",
    "Cắt giảm hơn 85% thời gian và chi phí nhân sự xử lý khiếu nại so với các mô hình truyền thống.",
    "Một số trường hợp tranh chấp phức tạp có giá trị lớn vẫn cần Admin thẩm định thủ công.",
    "Giai đoạn Scale-Up sẽ ứng dụng AI Computer Vision để tự động so khớp điểm khác biệt giữa ảnh lúc giao và ảnh lúc nhận đồ."
)

add_analysis_block(
    "Tử Huyệt 2: Logistics 2 Chiều & Thời Gian Bất Động Của Tài Sản (Asset Utilization)",
    "Hàng đi 2 chiều khiến chi phí ship gấp đôi. Nguy hiểm hơn là thời gian tài sản bị 'đóng băng' trên đường vận chuyển. Nếu chuyển phát liên tỉnh mất 3 ngày đi và 3 ngày về, một chiếc váy chỉ phục vụ sự kiện 3 tiếng nhưng mất trọn 6 ngày bất động, một tháng chỉ cho thuê được 2-3 lần khiến hiệu suất sinh lời quá thấp.",
    "CLOOP áp dụng chiến lược Thanh Khoản Cục Bộ (Hyper-local Liquidity): Ưu tiên ghép nối tủ đồ và khách thuê trong bán kính 5 - 10km. Thời gian giao nhận chỉ mất 2 - 4 giờ qua bưu tá nội thành hoặc khách tự lấy tại CLOOP Hub.",
    "Rút ngắn thời gian luân chuyển xuống dưới 24 giờ. Một chiếc váy có thể quay vòng từ 6 - 8 lần/tháng vào mùa cao điểm, tăng gấp 3 lần hiệu suất sinh lời cho Chủ tủ.",
    "Mật độ nguồn cung ban đầu ở một số quận huyện ngoại thành có thể chưa đủ dày đặc để phủ kín bán kính 5km.",
    "Tập trung thâm nhập theo từng cụm trường Đại học và khu văn phòng lớn trước khi mở rộng diện rộng."
)

add_analysis_block(
    "Tử Huyệt 3: Cuộc Xâm Lăng Của Thời Trang Nhanh (Fast Fashion vs Occasion Economics)",
    "Người tiêu dùng có thể lên Shopee/TikTok/Taobao mua đứt một chiếc đầm mới giá chỉ 200k - 250k (chất lượng vải thấp) thay vì phải đi thuê đồ cũ giá 200k kèm tiền cọc và nỗi lo làm bẩn đồ.",
    "CLOOP không cạnh tranh ở phân khúc quần áo mặc thường ngày. CLOOP định vị vào Kinh Tế Học Sự Kiện (Occasion Economics): Cho thuê các trang phục thiết kế cao cấp, áo dài, đầm dạ tiệc, vest có giá bán từ 1.500.000đ đến 5.000.000đ với giá thuê chỉ 200k - 350k. Khách hàng chi trả 200k để khoác lên người chất lượng của 2 triệu và tỏa sáng đúng 1 đêm.",
    "Tạo ra giá trị mà thời trang nhanh giá rẻ hoàn toàn không thể cạnh tranh về form dáng, chất liệu và độ sang trọng.",
    "Tần suất nhu cầu thuê đồ sự kiện thấp hơn so với nhu cầu mua sắm quần áo mặc hàng ngày.",
    "Bổ sung gói dịch vụ trọn gói kèm phụ kiện (túi xách, trang sức) để tối ưu giá trị giỏ hàng mỗi lần thuê sự kiện."
)

add_analysis_block(
    "Tử Huyệt 4: Thanh Khoản Cục Bộ & Mạng Lưới Phân Tán (Local Network Effects)",
    "Một chiếc váy size S ở Hà Nội hoàn toàn vô nghĩa với một cô gái đang cần thuê gấp ở TP.HCM tối nay. Việc mở rộng tràn lan mà không có mật độ tập trung sẽ khiến sàn trở thành 'chợ ảo không có giao dịch'.",
    "CLOOP xây dựng mạng lưới theo nguyên lý 'Bán kính thanh khoản': Thuật toán tìm kiếm ưu tiên hiển thị các sản phẩm có thể nhận trong ngày quanh vị trí của người dùng; xây dựng các trạm gom đồ CLOOP Hub tại các tòa nhà trung tâm.",
    "Tạo ra hiệu ứng mạng lưới địa phương (Local Network Effect) vững chắc mà các đối thủ thương mại điện tử giao hàng chậm từ kho trung tâm không thể sao chép.",
    "Đòi hỏi công tác tuyển chọn tủ đồ (Founding 100) phải được phân bổ đồng đều theo các khu vực địa lý trọng điểm.",
    "Áp dụng chính sách thưởng Leaf Coins cho các chủ tủ ở những khu vực đang thiếu hụt nguồn cung để cân bằng thanh khoản."
)

# ==================== CHUYÊN ĐỀ III (7 CÂU HỎI VC) ====================
add_heading_1("III. BỘ GIÁP 7 CÂU HỎI TỬ THẦN CỦA QUỸ ĐẦU TƯ (VC Q&A MATRIX)")
add_body_p(
    "Dưới đây là bộ ma trận đối thoại bóc tách 7 câu hỏi hóc búa nhất mà các nhà đầu tư mạo hiểm (Venture Capitals) và Ban Giám Khảo sẽ đặt ra cho CLOOP:"
)

table_vc = doc.add_table(rows=8, cols=3)
table_vc.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(table_vc)

headers_vc = ["Câu hỏi chất vấn của VC", "Bản chất bài toán", "Câu trả lời bảo vệ của CLOOP"]
for i, name in enumerate(headers_vc):
    cell = table_vc.rows[0].cells[i]
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

data_vc = [
    [
        "1. Một đơn thuê 200k sau MỌI chi phí còn lại bao nhiêu?",
        "Unit Economics & Contribution Margin",
        "Lãi gộp dương ngay từ đơn đầu: Phí ship luân chuyển do Khách và Chủ tủ san sẻ qua thuật toán Block 5K; Cổng thanh toán VietQR phí gần như 0đ; Phí sàn thu 12% (24.000đ) khi kết thúc nghiệm thu. Sàn không đốt tiền bù ship hay trợ giá ảo."
    ],
    [
        "2. Một món đồ trung bình quay được bao nhiêu vòng đời?",
        "Asset Utilization",
        "Nhờ thanh khoản cục bộ (bán kính 5-10km), thời gian bất động giảm từ 6 ngày xuống dưới 24h. Một chiếc váy dạ hội chất lượng tốt quay vòng 6-8 lần/tháng vào mùa sự kiện, đạt vòng đời 15-20 lượt thuê trước khi thanh lý."
    ],
    [
        "3. Chủ tủ ở lại hay rời đi sau 3 tháng?",
        "Lender Retention",
        "Chủ tủ gắn bó vì CLOOP loại bỏ 'Cơn đau đầu cãi vã' (Zero CS Headache). Hệ thống tự xử lý cọc, vận đơn và nghiệm thu. Một chiếc váy 1.500.000đ mang lại 800.000đ dòng tiền thụ động sau 2 tháng mà không tốn công quản lý."
    ],
    [
        "4. Khách thuê lần 2 sau bao lâu?",
        "Renter Retention",
        "CLOOP đánh vào Occasion Economics. Một người trẻ có 4-5 dịp sự kiện/năm (Kỷ yếu, Prom, Đám cưới, Tiệc). Tỷ lệ quay lại kỳ vọng 2-3 lần/năm. Động lực lớn nhất là điểm Trust Score: càng thuê uy tín, cọc càng giảm, hạn mức càng tăng."
    ],
    [
        "5. Tỷ lệ tranh chấp (Dispute Rate) là bao nhiêu?",
        "Dispute Management",
        "Bản chất rental có tỷ lệ hoàn trả 100%. CLOOP chia làm 2: Lỗi vi mô (son, mồ hôi, xước chỉ) xử lý theo Digital Damage Protocol (chủ tủ tự giặt/sửa, không trừ cọc); Lỗi vĩ mô (rách, mất) kỳ vọng dưới 3%, được bảo vệ bởi trần Exposure Limit và Timeline đối soát."
    ],
    [
        "6. Tại sao người dùng không mua luôn đồ rẻ Shopee/TikTok?",
        "Competitor Defense",
        "Vì CLOOP bán 'Sự lộng lẫy tạm thời'. Đồ dạ tiệc Taobao 250k chất vải mỏng, form xộc xệch. Váy thiết kế local brand giá gốc 2 triệu chuẩn form. Người dùng bỏ 200k để khoác lên đẳng cấp của 2 triệu trong 1 đêm, không chật tủ quần áo."
    ],
    [
        "7. Nếu bỏ AI đi, CLOOP còn lợi thế gì?",
        "Core Moat",
        "AI chỉ là công cụ tối ưu vận hành. Lợi thế cốt lõi của CLOOP là Hạ Tầng Niềm Tin (Trust Stack), Dữ Liệu Lịch Sử Giao Dịch và Thanh Khoản Địa Phương. Khi đã có 10.000 user sở hữu điểm Trust Score cao, đối thủ không thể bứng tệp khách này đi vì họ bị giữ chân bởi đặc quyền giảm cọc."
    ]
]

for r_idx, row_data in enumerate(data_vc):
    row_cells = table_vc.rows[r_idx + 1].cells
    bg = "FFFFFF" if r_idx % 2 == 0 else "F9FBF9"
    for c_idx, val in enumerate(row_data):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg)
        set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=100, right=100)
        p = row_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx in [0, 1, 2] else WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(10.5)

# ==================== CHUYÊN ĐỀ IV (DIGITAL DAMAGE PROTOCOL) ====================
add_heading_1("IV. DIGITAL DAMAGE PROTOCOL: CHUẨN HÓA 3 CẤP ĐỘ THIỆT HẠI")
add_body_p(
    "Để giải quyết triệt để vấn nạn Chủ tủ 'ăn vạ' đòi trừ cọc vì những vết bẩn giặt được (vết son môi, phấn trang điểm) và ngăn chặn rủi ro đạo đức (Moral Hazard), CLOOP ban hành Quy chuẩn Phân loại Thiệt hại Số (Digital Damage Protocol):"
)

add_analysis_block(
    "1. Quy Chuẩn 3 Cấp Độ Thiệt Hại (Damage Classification Standards)",
    "Level 1 (Wear & Tear - Hao mòn thông thường): Vết son môi bề mặt, phấn trang điểm nhẹ, mồ hôi, mùi cơ thể, nếp nhăn vải -> KHÔNG ĐƯỢC TÍNH LÀ THIỆT HẠI. Chi phí này nằm trong giá thuê, Chủ tủ tự giặt ủi theo quy trình thông thường, cấm trừ cọc.\n"
    "Level 2 (Repairable Damage - Hư hỏng có thể khắc phục): Vết bẩn cần giặt hấp chuyên sâu, bung cúc, xước nhẹ khâu lại được -> Chỉ được khấu trừ CHI PHÍ SỬA CHỮA THỰC TẾ HỢP LÝ (tối đa 500.000đ), cấm tịch thu toàn bộ tiền cọc.\n"
    "Level 3 (Total Loss - Tổn thất thực sự): Rách toạc cấu trúc không phục hồi được, cháy, mất đồ -> Khấu trừ theo giá trị thỏa thuận trong hợp đồng thuê điện tử.",
    "Bảo vệ khách thuê khỏi các hành vi bắt chẹt vô lý; chuẩn hóa ranh giới tranh chấp rành mạch không thể cãi vã.",
    "Được lập trình trực tiếp vào mã nguồn Server Action (`app/actions/dispute.ts`): Hệ thống tự động từ chối nếu khiếu nại thuộc nhóm Wear & Tear mà đòi cọc.",
    "Một số chủ tủ có thể cho rằng quy định này khắt khe với họ hơn so với việc tự cho thuê ngoài đời.",
    "Cung cấp gói dịch vụ giặt hấp sinh học đối tác với mức giá ưu đãi dành riêng cho Chủ tủ CLOOP."
)

add_analysis_block(
    "2. Quy Tắc Vàng: Cấm Can Thiệp Hiện Trạng Trước Khi Lập Bằng Chứng",
    "Chủ tủ nhận hàng hoàn về bắt buộc phải chụp ảnh/quay video hiện trạng có Timestamp TRƯỚC KHI GIẶT HOẶC SỬA. Nếu chủ tủ tự ý đem giặt hoặc can thiệp xử lý trước khi gửi khiếu nại lên hệ thống, hồ sơ tranh chấp sẽ lập tức bị bác bỏ do mất tính nguyên trạng của bằng chứng.",
    "Ngăn chặn hoàn toàn tình trạng chủ tủ tự làm hỏng thêm hoặc dùng hóa đơn giặt khống để đòi tiền đền bù của khách.",
    "Tính kỷ luật số cao: Bằng chứng chỉ có giá trị khi đối chiếu được mốc Before (lúc đóng gói) so với mốc After (lúc nhận lại).",
    "Chủ tủ phải dành 2-3 phút quay video kiểm tra lúc mở hộp nhận lại đồ.",
    "Tích hợp tính năng Checklist nghiệm thu 1-chạm (1-Click Inspection) ngay trên giao diện đơn hàng để hướng dẫn chủ tủ từng bước."
)

add_analysis_block(
    "3. Risk Engine Ngược (Owner Trust Score): Giám Sát Chủ Tủ Trục Lợi",
    "Hệ thống không chỉ chấm điểm Khách thuê, mà còn theo dõi tỷ lệ khiếu nại của Chủ tủ. Nếu một Chủ tủ có tỷ lệ khiếu nại vượt quá 25% số đơn hoàn tất (Owner Dispute Rate >= 25%), hệ thống tự động gắn cờ cảnh báo HIGH_DISPUTE_OWNER, trừ điểm Trust Score và giảm ưu tiên hiển thị tủ đồ.",
    "Thanh lọc các chủ tủ độc hại (Toxic Owners) ra khỏi hệ sinh thái, bảo vệ uy tín lâu dài của toàn sàn.",
    "Được ghi nhận tự động vào Audit Log kiểm toán của hệ thống, minh bạch và không thiên vị.",
    "Chủ tủ bị cảnh báo có thể phản ứng tiêu cực.",
    "Cung cấp quy trình khiếu nại lại (Appeal Process) cho Chủ tủ nếu họ chứng minh được các đơn bị tranh chấp là do lỗi bưu tá GHN."
)

# ==================== CHUYÊN ĐỀ V ====================
add_heading_1("V. THUẬT TOÁN LOGISTICS SAN SẺ 50/50 & ĐỆM RỦI RO BLOCK 5K")
add_body_p(
    "CLOOP áp dụng thuật toán chia đôi cước vận chuyển chuẩn hóa: Khách thuê thanh toán trước 25.000đ cho lượt đi ngay lúc tạo đơn; Chủ tủ khấu trừ 25.000đ cho lượt về từ doanh thu cho thuê trước khi giải ngân. Mọi mức cước thực tế từ API GHN đều được làm tròn trần (Ceil) lên mốc 5.000đ gần nhất theo công thức: Cước niêm yết = ⌈ Cước thực tế / 5.000 ⌉ × 5.000."
)

# Bảng Block 5K
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

# ==================== CHUYÊN ĐỀ VI ====================
add_heading_1("VI. MA TRẬN DÒNG TIỀN & LỚP ĐIỀU PHỐI THANH TOÁN (ORCHESTRATION LAYER)")
add_body_p(
    "Toàn bộ tài chính của CLOOP tuân thủ nguyên tắc Kế toán Kép. Lớp điều phối kiểm soát trạng thái giao dịch và kết nối trực tiếp với cổng thanh toán để giải ngân theo điều kiện:"
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

# ==================== CHUYÊN ĐỀ VII (TRUST STACK) ====================
add_heading_1("VII. KIẾN TRÚC 'CLOOP TRUST STACK' & PROGRESSIVE RISK ENGINE")
add_body_p(
    "Thay vì áp dụng cơ chế eKYC nặng nề chặn cửa (bắt chụp CCCD + selfie ngay lúc đăng ký), CLOOP chuyển dịch sang mô hình 'Trust Stack Tích Lũy Lũy Tiến' và 'Kiểm Soát Trần Thiệt Hại' (Damage Isolation):"
)

add_analysis_block(
    "1. Tầng Account Trust & Identity as a Privilege",
    "Đăng ký ban đầu cực nhẹ qua Supabase Auth: Chỉ cần Email OTP / Magic Link và Số điện thoại. Xác minh danh tính sinh viên (@edu.vn) hay giấy tờ chỉ xuất hiện như một QUYỀN LỢI (Privilege) khi người dùng chủ động muốn 'Giảm tiền cọc' hoặc 'Mở rộng hạn mức thuê đồ cao cấp'.",
    "Giảm thiểu 90% ma sát đăng ký ban đầu cho người dùng trẻ Gen Z; tỷ lệ kích hoạt tài khoản thành công tăng vọt; tôn trọng quyền riêng tư.",
    "Tách bạch rành mạch giữa 'Account Control' và 'Legal Identity'. Email trường đại học chỉ được gắn nhãn 'Student Email Verified', không đánh đồng là định danh pháp lý tuyệt đối.",
    "Tài khoản mới chỉ có mức độ tin cậy cơ bản, chưa đủ điều kiện nhận ưu đãi giảm cọc.",
    "Khuyến khích người dùng liên kết email trường để nhận ngay huy hiệu Sinh viên và giảm 30% cọc cho các đơn dưới 1 triệu."
)

add_analysis_block(
    "2. Dynamic Progressive Trust & Công Thức Cọc Động f(Value, Trust, History)",
    "Loại bỏ quy tắc cứng nhắc 'Đơn 1 cọc 100%, Đơn 2 cọc 50%, Đơn 3 miễn cọc'. Áp dụng công thức cọc động: Tiền Cọc = f(Giá Trị Đồ, Trust Score, Lịch Sử Đơn Hoàn Tất, Tín Hiệu Rủi Ro). Điểm Trust Score được tích lũy dần qua hành vi trả đồ đúng hẹn, không tranh chấp.",
    "Tạo động lực mạnh mẽ để người dùng giữ gìn đồ và gắn bó lâu dài với sàn; biến Trust Score thành một loại tài sản uy tín cá nhân của chính người dùng.",
    "Explainable Trust & Gamified UX: Hiển thị minh bạch lý do tiền cọc thay đổi trên giỏ hàng (Ví dụ: 'Bạn được giảm 50% cọc nhờ Trust Score Hạng A; Hoàn tất đơn này đúng hẹn để nâng hạng VIP!').",
    "Người dùng có thể thắc mắc tại sao cùng một chiếc váy nhưng 2 tài khoản lại thấy mức cọc khác nhau nếu giao diện không giải thích rõ ràng.",
    "Gamification giao diện giỏ hàng: Luôn hiển thị dòng chữ giải thích phần tiền cọc được miễn giảm như một 'phần thưởng uy tín'."
)

add_analysis_block(
    "3. Silent Risk Engine & Transaction Exposure Limit",
    "Chạy ngầm trong Server Actions để giám sát các tín hiệu bất thường: thiết bị mới, nhiều tài khoản chung 1 thiết bị, tỷ lệ hủy đơn cao. Áp dụng Hạn mức Tài sản Đang giữ (Exposure Limit) theo cấp độ tín nhiệm: New User <= 2 triệu; Trusted <= 6 triệu; VIP <= 20 triệu.",
    "Thay vì cố gắng 'chặn 100% người xấu', CLOOP 'giới hạn thiệt hại tối đa' (Damage Isolation) nếu có người xấu vượt qua. Kẻ gian Level 0 chỉ tiếp cận tối đa 1-2 triệu đồng, nằm trong khả năng tự hấp thụ của hệ thống.",
    "Friction thông minh: 99% người dùng chân chính không cảm thấy phiền toái, hệ thống chỉ kích hoạt phòng thủ khi phát hiện dấu hiệu bất thường.",
    "Khách hàng mới có nhu cầu thuê đồ dạ hội đắt tiền ngay lần đầu có thể gặp rào cản hạn mức (The Whale Problem).",
    "Cơ chế Fast-Track Trust cho khách VIP: Cho phép khách mới thuê đồ giá trị cao nếu tự nguyện cấp bảo lãnh mạnh: (A) Pre-Authorization phong tỏa tạm thời trên thẻ tín dụng quốc tế (không trừ tiền thật) hoặc (B) Đặt cọc 100% tiền mặt qua VietQR."
)

# ==================== CHUYÊN ĐỀ VIII (DATA PRIVACY) ====================
add_heading_1("VIII. KHUNG BẢO VỆ DỮ LIỆU CÁ NHÂN (LUẬT 91/2025/QH15 & NĐ 356/2025/NĐ-CP)")
add_body_p(
    "CLOOP áp dụng triệt để nguyên lý 'Privacy by Design' và 'Collect less -> Verify smarter' theo Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP (hiệu lực từ 01/01/2026):"
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

# ==================== CHUYÊN ĐỀ IX (ROADMAP 3 GIAI ĐOẠN) ====================
add_heading_1("IX. LỘ TRÌNH TRIỂN KHAI 3 GIAI ĐOẠN (PRODUCT ROADMAP)")
add_body_p(
    "Để tránh bẫy 'Over-engineering' và đảm bảo tính khả thi thực tế của một Startup sinh viên, kiến trúc của CLOOP được phân kỳ rõ ràng:"
)

add_bullet_item("1. PHASE 1: LIVE NOW (Phiên bản MVP Techfest): ", "Next.js + Supabase Auth (Email/Phone OTP) + VietQR PayOS Orchestration + Trust Score V1 (cọc 100% với user mới) + Upload video Before/After + Logistics GHN san sẻ ship 50/50 + Digital Damage Protocol (3 cấp độ). Chi phí eKYC: 0 đồng.")
add_bullet_item("2. PHASE 2: MVP NEXT (Giai đoạn Growth 2028): ", "Tự động hóa Exposure Limit Engine + Progressive Trust tự giảm cọc + Digital Evidence Timeline UI + Pessimistic locking tại DB khi concurrency cao + Micro-resolution tự động.")
add_bullet_item("3. PHASE 3: SCALE-UP ARCHITECTURE (Giai đoạn gọi vốn VC 2029+): ", "Tích hợp đối tác eKYC chuyên dụng (Face match/Liveness) + AI Computer Vision tự động so khớp xước/bẩn + Multi-carrier failover (GHN/GHTK) + Cold storage R2/Google One.")

# Kết luận
p_end = doc.add_paragraph()
p_end.paragraph_format.space_before = Pt(14)
p_end.paragraph_format.space_after = Pt(14)
p_end.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_end = p_end.add_run(
    "KẾT LUẬN: Báo cáo v4.0 khẳng định CLOOP không né tránh rủi ro mà trực diện đối thoại và hóa giải 4 Tử huyệt lớn nhất của ngành kinh tế chia sẻ thời trang. "
    "Bằng sự kết hợp giữa Digital Damage Protocol, Lớp Điều Phối Thanh Toán, Khung Bảo Vệ Dữ Liệu Cá Nhân Chuẩn Luật 91/2025/QH15 và Lộ trình phân kỳ 3 giai đoạn sắc bén, "
    "CLOOP chứng minh năng lực sẵn sàng bảo vệ thành công trước Hội Đồng Giám Khảo Techfest và tự tin tiến vào vòng gọi vốn hạt giống (Seed Round)."
)
r_end.font.name = 'Times New Roman'
r_end.font.size = Pt(12.5)
r_end.font.italic = True
r_end.font.bold = True
r_end.font.color.rgb = RGBColor(0x0F, 0x4A, 0x34)

# Lưu file
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
