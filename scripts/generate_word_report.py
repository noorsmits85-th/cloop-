import os
import shutil
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for m, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{m}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_shading(cell, color_hex="FFFFFF"):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex)
    tcPr.append(shd)


def set_table_borders(table, color="000000", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for border_name in ["top", "left", "bottom", "right", "insideH", "insideV"]:
        border = OxmlElement(f"w:{border_name}")
        border.set(qn("w:val"), val)
        border.set(qn("w:sz"), sz)
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), color)
        borders.append(border)
    tblPr.append(borders)


def format_run(run, bold=False, italic=False, size_pt=13):
    run.font.name = "Times New Roman"
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), "Times New Roman")
    rFonts.set(qn("w:hAnsi"), "Times New Roman")
    rFonts.set(qn("w:cs"), "Times New Roman")
    rFonts.set(qn("w:eastAsia"), "Times New Roman")


def add_para(doc, text="", bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=5, line_spacing=1.3):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.line_spacing = line_spacing
    if text:
        r = p.add_run(text)
        format_run(r, bold=bold, italic=italic, size_pt=13)
    return p


def add_bw_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, color="000000", sz="4")

    hdr_cells = table.rows[0].cells
    for idx, h_text in enumerate(headers):
        set_cell_shading(hdr_cells[idx], "FFFFFF")
        set_cell_margins(hdr_cells[idx])
        p = hdr_cells[idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.2
        r = p.add_run(h_text)
        format_run(r, bold=True, size_pt=13)

    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row_data):
            set_cell_shading(row_cells[c_idx], "FFFFFF")
            set_cell_margins(row_cells[c_idx])
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.2
            r = p.add_run(val)
            format_run(r, bold=(c_idx == 0), size_pt=13)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table


def add_diagram_block(doc, img_path, caption_title):
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(4)
        p_img.paragraph_format.space_after = Pt(2)
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=Cm(15.8))

        add_para(
            doc,
            caption_title,
            bold=True,
            align=WD_ALIGN_PARAGRAPH.CENTER,
            space_before=2,
            space_after=8
        )


def build_report():
    doc = Document()

    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(3.0)
        section.right_margin = Cm(2.0)
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(2.0)

    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Times New Roman"
    normal_style.font.size = Pt(13)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)

    # TIÊU ĐỀ (KHÔNG VIẾT HOA BỪA BÃI, CHỮ ĐEN NỀN TRẮNG, TIMES NEW ROMAN 13)
    add_para(
        doc,
        "Báo cáo tóm gọn phân tích dòng tiền, 7 điểm nghẽn vận hành, cơ chế xoay vòng tiền cọc trong ví, bài toán chi phí mặt bằng số, điểm hòa vốn và sự ăn khớp giữa khảo sát nghiên cứu khoa học (722 mẫu) với dữ liệu thị trường (320 mẫu) của dự án CLOOP",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=0,
        space_after=6
    )

    add_para(
        doc,
        "Bản trình bày bằng ngôn ngữ kinh tế đời thường, chữ đen nền trắng, chuẩn phông chữ Times New Roman cỡ 13, lề trái 3cm, lề phải 2cm, lề trên 2cm, lề dưới 2cm",
        italic=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=0,
        space_after=10
    )

    # =========================================================================
    # MỞ ĐẦU: 5 SƠ ĐỒ CHỮ ĐEN NỀN TRẮNG Ở NGAY ĐẦU BẢNG WORD
    # =========================================================================
    add_para(
        doc,
        "Mục mở đầu: Năm sơ đồ tổng thể dòng tiền, điểm nghẽn vận hành, cơ chế xoay vòng ví, khớp nối dữ liệu và bài toán chi phí mặt bằng số kèm điểm hòa vốn",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=6,
        space_after=4
    )

    diag_dir = os.path.join(os.getcwd(), "public", "diagrams")
    add_diagram_block(
        doc,
        os.path.join(diag_dir, "so_do_1_mach_dong_tien_tong_the.png"),
        "Hình 1: Sơ đồ dòng tiền ra vào, két giữ tiền trung gian (5 đến 9 ngày) và 4 trường hợp chia tiền"
    )
    add_diagram_block(
        doc,
        os.path.join(diag_dir, "so_do_2_mach_van_hanh_va_7_diem_nghen.png"),
        "Hình 2: Sơ đồ 6 bước vận hành đơn hàng và 7 điểm nghẽn thực tế cần khóa chặt"
    )
    add_diagram_block(
        doc,
        os.path.join(diag_dir, "so_do_3_luan_chuyen_vi_6_lop_giap.png"),
        "Hình 3: Sơ đồ dùng lại 800.000đ tiền cọc trong ví để đặt đơn mới 1.000.000đ và 6 lớp khóa chống gian lận"
    )
    add_diagram_block(
        doc,
        os.path.join(diag_dir, "so_do_4_anh_xa_sem_du_lieu_thuc_chung_cloop.png"),
        "Hình 4: Sơ đồ khớp nối giữa khảo sát lý thuyết nghiên cứu khoa học (722 người) và khảo sát thực tế thị trường (320 mẫu)"
    )
    add_diagram_block(
        doc,
        os.path.join(diag_dir, "so_do_5_cau_truc_doanh_thu_chi_phi_mat_bang_so_va_hoa_von.png"),
        "Hình 5: Sơ đồ cấu trúc doanh thu, chi phí thuê mặt bằng số (117.000đ/ngày), cách trả tiền Cloud khi vốn đọng 5-9 ngày và Điểm hòa vốn"
    )

    # =========================================================================
    # PHẦN I: TIỀN RA VÀO SÀN NHƯ THẾ NÀO?
    # =========================================================================
    add_para(
        doc,
        "Phần I. Dòng tiền ra vào sàn CLOOP chảy như thế nào?",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=10,
        space_after=4
    )

    add_para(
        doc,
        "- Bản chất kinh tế của CLOOP là mô hình sàn trung gian kết nối người có váy nhàn rỗi và người cần thuê váy (C2C). Sàn không bỏ vốn mua váy về kho nên không bao giờ bị đọng vốn hàng tồn kho, mà đóng vai trò người giữ két sắt trung gian (Escrow) để bảo vệ cả hai bên.",
        space_after=4
    )

    add_para(
        doc,
        "- Ba nguồn tiền chảy vào tài khoản ngân hàng của sàn:",
        bold=True,
        space_after=3
    )
    add_para(doc, "+ Nguồn 1 (Tiền đơn hàng): Khi khách đặt thuê váy, khách đóng tổng cộng một cục gồm Tiền thuê + Tiền cọc bảo đảm + Tiền ship chiều đi (ví dụ: 200.000đ tiền thuê + 800.000đ tiền cọc = 1.000.000đ).", space_after=3)
    add_para(doc, "+ Nguồn 2 (Tiền xác thực tài khoản 2.000đ): Khách chuyển khoản đúng 2.000đ để chứng minh tài khoản ngân hàng chính chủ trước khi được rút tiền. Sàn không lấy 2.000đ này mà cộng trả nguyên vào ví cho khách.", space_after=3)
    add_para(doc, "+ Nguồn 3 (Tiền mua gói Lá đẩy Top từ 20.000đ đến 100.000đ): Chủ tủ trả tiền để bài đăng váy của mình được ưu tiên hiện lên đầu trang. Đây là doanh thu dịch vụ ăn ngay 100% của sàn.", space_after=5)

    add_para(
        doc,
        "- Thời gian tiền nằm trong két của sàn (vốn lưu đọng từ 5 đến 9 ngày) và 4 ngả chia tiền đầu ra:",
        bold=True,
        space_after=3
    )
    add_para(doc, "+ Mỗi đơn hàng từ lúc chủ tủ gói đồ (tối đa 2 ngày), gửi ship và khách mặc đi tiệc (3 đến 5 ngày) cho tới lúc gửi trả và kiểm tra đồ (1 ngày) kéo dài trung bình từ 5 đến 9 ngày. Trong suốt 5 đến 9 ngày này, toàn bộ 1.000.000đ nằm yên trong tài khoản ngân hàng của sàn.", space_after=3)
    add_para(doc, "+ Ngả 1 (Khi đơn hoàn tất tốt đẹp sau 24 giờ trả đồ): Sàn trả lại nguyên 100% tiền cọc (800.000đ) vào ví của khách; trả tiền cho chủ tủ bằng Giá thuê trừ đi 12% phí hoa hồng sàn và trừ 25.000đ tiền ship chiều về; phần 12% hoa hồng thuộc về doanh thu của sàn.", space_after=3)
    add_para(doc, "+ Ngả 2 (Khi chủ tủ bỏ bê quá 48 giờ không chịu gửi hàng): Hệ thống tự động hủy đơn và hoàn trả 100% toàn bộ số tiền khách đã đóng (cả tiền thuê, tiền cọc và tiền ship) về ví cho khách.", space_after=3)
    add_para(doc, "+ Ngả 3 (Khi có khiếu nại rách váy hoặc giao sai mẫu - Sàn đứng ở giữa giải quyết tranh chấp chia cấp theo 3 mức độ rõ ràng): (1) Cấp độ 1 - Hao mòn thông thường (vết bẩn bề mặt nhẹ, mồ hôi, nếp nhăn đã tính trong giá thuê): trừ 0đ tiền cọc, khách được nhận lại 100% tiền cọc (chặn đứng nạn chủ tiệm soi lỗi vặt trừ cọc oan 100k đến 200k); (2) Cấp độ 2 - Hư hỏng có thể sửa chữa, khắc phục (đứt chỉ, hỏng khóa kéo, vết bẩn cần giặt tẩy chuyên sâu có video mở hộp đối chứng): sàn đứng ra phân xử theo mức độ thực tế, trích tối đa không quá 50% tiền cọc để đền bù chi phí sửa chữa cho chủ tủ, phần tiền cọc thừa trả lại ngay vào ví cho khách; (3) Cấp độ 3 - Hư hỏng hoàn toàn không thể phục hồi hoặc làm mất đồ: trích tối đa tới 100% tiền cọc để đền bù cho chủ tủ. Ngược lại, nếu lỗi do chủ tủ giao váy rách sẵn hoặc sai mẫu, khách được nhận lại 100% cả tiền cọc lẫn tiền thuê.", space_after=3)
    add_para(doc, "+ Ngả 4 (Cuối tháng chốt sổ kế toán): Sàn gom toàn bộ phí hoa hồng 12% và tiền bán gói Lá đẩy Top, sau đó trích ra 5% trên tổng doanh thu phí này đưa vào Quỹ dự phòng rủi ro để xử lý các sự cố phát sinh mà không bao giờ ăn lẹm vào tiền cọc của khách.", space_after=6)

    # =========================================================================
    # PHẦN II: 7 ĐIỂM NGHẼN KHI VẬN HÀNH THỰC TẾ VÀ CÁCH HÓA GIẢI
    # =========================================================================
    add_para(
        doc,
        "Phần II. Bảy điểm nghẽn thực tế khi vận hành và cách sàn đã khóa chặt",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=10,
        space_after=4
    )

    add_bw_table(
        doc,
        ["Điểm nghẽn thực tế ngoài đời", "Hậu quả kinh tế nếu không chặn", "Cách sàn CLOOP giải quyết tự động"],
        [
            [
                "- Nghẽn 1: Lệch tiền ship chiều trả hàng (đang thu cố định 25.000đ)",
                "+ Nếu đơn liên tỉnh bưu cục thu 35.000đ đến 45.000đ thì sàn phải lấy phí hoa hồng 12% ra bù lỗ",
                "+ Cộng sẵn 10% dự phòng làm tròn 5.000đ ở chiều đi; tại nội thành TP. Vinh áp dụng chia đôi phí ship mỗi bên chỉ 14.000đ/chiều"
            ],
            [
                "- Nghẽn 2: Chủ tủ nhận lại váy rồi nhưng quên vào web bấm nút Đã nhận",
                "+ Tiền cọc 800.000đ của khách bị treo cứng trong két của sàn không giải ngân được, khách bức xúc",
                "+ Hệ thống tự động hỏi thẳng dữ liệu của bên giao hàng GHN và GHTK; thấy bưu tá báo Đã giao trả thành công là tự mở đếm 24h trả cọc cho khách"
            ],
            [
                "- Nghẽn 3: Ngân hàng ẩn số tài khoản người gửi khi chuyển khoản xác thực 2.000đ",
                "+ Khách chuyển 2.000đ xong mà chưa được mở khóa rút tiền ngay, quản trị viên phải dò tay",
                "+ Hệ thống tự động khớp mã đơn xác thực với số tài khoản khách đã đăng ký trong hồ sơ để mở khóa tức thì và cộng trả 2.000đ vào ví"
            ],
            [
                "- Nghẽn 4: Khách mở mã QR lên xem rồi tắt trình duyệt không thanh toán",
                "+ Chiếc váy bị khóa lịch giữ chỗ ảo trong 15 phút, khách thật vào sau không đặt thuê được",
                "+ Ngay khi khách bấm nút X đóng khung mã QR, hệ thống hủy đơn nháp và mở khóa lịch thuê ngay lập tức trong 0,1 giây"
            ],
            [
                "- Nghẽn 5: Hai bên cãi nhau khi váy bị rách hoặc dính bẩn lúc trả hàng",
                "+ Toàn bộ tiền của đơn hàng bị đóng băng, quản trị viên mất nhiều thời gian phân xử cảm tính",
                "+ Bắt buộc có ảnh và video mở hộp đối chứng 2 đầu, sàn đứng giữa phân xử chia theo 3 cấp độ: Cấp 1 (hao mòn nhẹ) trừ 0đ cọc; Cấp 2 (hư hỏng sửa được) trừ tối đa 50% cọc theo chi phí sửa thực tế, cọc thừa trả khách; Cấp 3 (rách hỏng hoàn toàn/mất đồ) đền tối đa 100% cọc; nếu chủ tủ giao váy hỏng/sai mẫu thì hoàn 100% cả cọc lẫn tiền thuê cho khách"
            ],
            [
                "- Nghẽn 6: Khách bị chôn vốn kép 1.800.000đ nếu muốn thuê tiếp đơn thứ 2",
                "+ Khách thấy phiền nên rút sạch 800.000đ cọc về ngân hàng rồi bỏ đi, sàn mất trắng nguồn vốn lưu đọng",
                "+ Mở tính năng Dùng lại số dư ví tại trang Thanh toán (chỉ cần quét QR bù thêm 200.000đ tiền thuê mới)"
            ],
            [
                "- Nghẽn 7: Tiền nằm chờ từ 5 đến 9 ngày mỗi đơn trong tài khoản không kỳ hạn",
                "+ Lãng phí nguồn vốn nhàn rỗi hàng chục triệu đồng nằm chết không sinh lời",
                "+ Giữ 40% ở tài khoản thanh toán để chi trả hàng ngày, đưa 60% vốn ổn định vào kỳ hạn ngắn 7 đến 14 ngày xoay vòng hưởng lãi ngân hàng"
            ]
        ]
    )

    # =========================================================================
    # PHẦN III: BÀI TOÁN XOAY VÒNG 800.000Đ TIỀN CỌC VÀ 6 LỚP KHÓA CHỐNG SỐ DƯ ẢO
    # =========================================================================
    add_para(
        doc,
        "Phần III. Giải bài toán xoay vòng 800.000đ tiền cọc sang đơn mới và 6 lớp khóa chống khống số dư ví",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=10,
        space_after=4
    )

    add_para(
        doc,
        "1. Tại sao ở đơn thứ 2 khách chỉ còn 800.000đ trong ví mà đơn mới lại cần 1.000.000đ?",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Ở đơn thứ nhất: Khách nạp vào 1.000.000đ (gồm 200.000đ tiền thuê + 800.000đ tiền cọc). Khi trả váy xong, 200.000đ tiền thuê đã trả cho chủ tủ số 1 và phí sàn. Khách nhận lại đúng 800.000đ tiền cọc vào ví.", space_after=3)
    add_para(doc, "- Sang đơn thứ hai (cũng có tổng giá trị 1.000.000đ gồm 200.000đ thuê + 800.000đ cọc): Trong ví khách lúc này chỉ có 800.000đ, tức là thiếu đúng 200.000đ tiền thuê mới.", space_after=3)
    add_para(doc, "- Cách giải quyết của CLOOP:", space_after=2)
    add_para(doc, "+ Trường hợp ví có từ 1.000.000đ trở lên (đủ 100%): Khách bấm 1 nút Đặt thuê ngay bằng số dư ví, đơn hàng hoàn tất trong 0,1 giây mà không cần quét bất kỳ mã QR nào.", space_after=2)
    add_para(doc, "+ Trường hợp ví có 800.000đ (nhỏ hơn tổng đơn 1.000.000đ): Hệ thống dùng toàn bộ 800.000đ tiền cọc đang có trong ví chuyển sang đơn mới, và tạo mã QR ngân hàng chỉ thu đúng 200.000đ phần còn thiếu. Nhờ vậy, khách chỉ phải bỏ thêm 200.000đ tiền thuê thực tế, còn 800.000đ tiền mặt thật vẫn nằm im trong tài khoản ngân hàng của sàn suốt nhiều tháng.", space_after=5)

    add_para(
        doc,
        "2. Sáu lớp khóa bảo vệ để không ai có thể tạo số dư ví khống (tiền ảo) đi thuê đồ thật:",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Lớp khóa 1 (Kiểm tra biên lai tiền thật từ ngân hàng): Trước khi cho phép dùng 800.000đ trong ví, hệ thống không tin vào con số hiển thị trên màn hình mà tự động cộng lại từ đầu: khách này trước đây đã từng quét mã QR nộp tiền thật vào ngân hàng ở đơn nào chưa, trừ đi số lần đã rút và đã tiêu còn lại bao nhiêu. Nếu bị kẻ gian sửa trộm con số trong máy tính mà không có biên lai ngân hàng gốc, hệ thống khóa đứng ngay lập tức.", space_after=3)
    add_para(doc, "- Lớp khóa 2 (Đóng dấu mật mã chống làm giả lịch sử ví): Mỗi khoản tiền ví đưa vào đơn hàng đều phải ghi rõ lấy từ mã biên lai ngân hàng nào và đóng con dấu bảo mật riêng của máy chủ. Kẻ gian không có chìa khóa của máy chủ thì không thể tự viết thêm dòng lịch sử giả vào sổ kế toán.", space_after=3)
    add_para(doc, "- Lớp khóa 3 (Xếp hàng từng giao dịch chống bấm nhiều tab cùng lúc): Khi khách bấm dùng ví, hệ thống khóa tài khoản đó lại trong 0,1 giây xử lý. Dù kẻ gian có mở 10 cửa sổ trình duyệt bấm đặt 10 chiếc váy cùng một tích tắc hoặc vừa đặt đơn vừa bấm rút tiền, 9 lệnh sau cũng bị chặn lại hoàn toàn.", space_after=3)
    add_para(doc, "- Lớp khóa 4 (Đổi ý tắt mã QR thì trả lại tiền ví ngay nhưng không làm tăng tiền gốc): Nếu khách đang mở màn hình quét thêm 200.000đ mà đổi ý bấm tắt không thuê nữa (hoặc để quá 15 phút), hệ thống tự động hủy đơn nháp và trả lại nguyên vẹn 800.000đ về ví cho khách ngay lập tức, đồng thời gạch bỏ lệnh giữ tiền trước đó để kẻ gian không thể lợi dụng việc đặt rồi hủy đơn nhằm tạo ra tiền thừa.", space_after=3)
    add_para(doc, "- Lớp khóa 5 (Chặn lỗi số tiền quét QR lẻ dưới 2.000đ): Ngân hàng không cho tạo mã QR dưới 2.000đ. Nếu đơn hàng 500.000đ mà ví khách có 499.000đ (thiếu 1.000đ), hệ thống tự động chỉ trừ ví 498.000đ để khách quét QR đúng 2.000đ, không bao giờ bị lỗi thanh toán.", space_after=3)
    add_para(doc, "- Lớp khóa 6 (Kiểm tra tổng tiền 2 nguồn khớp đúng hóa đơn): Khi ngân hàng báo khách đã quét xong 200.000đ, hệ thống cộng 200.000đ vừa thu với 800.000đ đã giữ từ ví, kiểm tra bằng đúng 1.000.000đ của hóa đơn gốc rồi mới cho đơn hàng chạy.", space_after=6)

    # =========================================================================
    # PHẦN IV: BÓC TÁCH DOANH THU ĐẾN TỪ ĐÂU, CHI PHÍ MẶT BẰNG SỐ MỖI NGÀY LÀ BAO NHIÊU, LẤY GÌ TRẢ TIỀN CLOUD KHI VỐN ĐỌNG 5-9 NGÀY VÀ ĐIỂM HÒA VỐN
    # =========================================================================
    add_para(
        doc,
        "Phần IV. Bóc tách chi tiết doanh thu đến từ đâu, chi phí thuê mặt bằng số mỗi ngày là bao nhiêu, cách trả tiền Cloud khi vốn đơn hàng đang bị ứ đọng 5 đến 9 ngày và tính Điểm hòa vốn",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=10,
        space_after=4
    )

    add_para(
        doc,
        "1. Doanh thu thực sự của sàn CLOOP đến từ đâu? (Phân biệt rõ giữa tiền khách gửi giữ hộ và tiền sàn thực sự được bỏ túi):",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Nhiều người mới nhìn vào dễ nhầm tưởng khách nạp 1.000.000đ là sàn có doanh thu 1.000.000đ. Thực tế về mặt kế toán, 800.000đ tiền cọc là tiền của khách, còn phần lớn tiền thuê là của chủ tủ. Tiền doanh thu thực sự chảy vào túi của sàn CLOOP đến từ 4 nguồn sau:", space_after=3)
    add_para(doc, "+ Nguồn doanh thu số 1 (Phí hoa hồng môi giới 12% trên giá thuê hoặc bán): Cứ mỗi đơn thuê thành công có giá thuê 150.000đ, sàn thu 12% bằng 18.000đ/đơn (hoặc ở gói tiết kiệm 125.000đ, sàn thu 12% bằng 15.000đ/đơn). Tuy nhiên, điểm cần lưu ý là khoản 18.000đ này bị khóa chung trong két cùng với tiền cọc suốt từ 5 đến 9 ngày, chỉ khi khách trả váy xong xuôi sau 24 giờ không khiếu nại thì sàn mới được mở khóa lấy ra tiêu.", space_after=3)
    add_para(doc, "+ Nguồn doanh thu số 2 (Tiền bán gói Lá và Đẩy Top hiển thị từ 20.000đ đến 100.000đ, tức tiền cho thuê vị trí đẹp trên mặt bằng số): Khi chủ tủ muốn chiếc váy của mình nổi lên đầu trang chủ mùa kỷ yếu hoặc cưới hỏi, họ mua gói Lá (20k được 20 Lá, 50k được 55 Lá, 100k được 120 Lá) để bấm Đẩy Top (10.000đ/lượt). Điểm quý giá nhất của nguồn thu này là: tiền bán gói Lá không phải là tiền cọc, không bị giam 5 đến 9 ngày mà chảy thẳng 100% vào túi doanh thu khả dụng của sàn ngay giây phút chủ tủ quét mã QR!", space_after=3)
    add_para(doc, "+ Nguồn doanh thu số 3 (Bảo toàn phí hoa hồng 12% khi đứng ra giải quyết tranh chấp theo 3 cấp độ và phần dư dự phòng vận chuyển): Khi có khiếu nại rách bẩn, sàn đứng ở giữa phân xử công tâm theo 3 mức độ (Cấp 1 hao mòn nhẹ trừ 0đ cọc; Cấp 2 hư hỏng sửa được trừ tối đa 50% cọc đền cho chủ tủ, cọc thừa trả khách; Cấp 3 hỏng hoàn toàn hoặc mất đồ đền tối đa 100% cọc). Nhờ cơ chế phân xử tự động có video mở hộp đối chứng, đơn hàng vẫn được quyết toán dứt điểm để sàn thu đủ 12% phí hoa hồng trên tiền thuê (trừ trường hợp lỗi do chủ tủ giao váy hỏng sẵn thì sàn hoàn 100% cả cọc lẫn tiền thuê cho khách). Ngoài ra ở chiều giao đi, công thức làm tròn biên độ 10% theo nấc 5.000đ giúp sàn có một quỹ đệm nhỏ để bù trừ rủi ro lệch giá ship chiều về.", space_after=3)
    add_para(doc, "+ Nguồn doanh thu số 4 (Lãi tiền gửi ngân hàng từ cục vốn lưu đọng Cash Float): Nhờ việc mỗi đơn hàng giữ cọc từ 500.000đ đến 800.000đ trong 5 đến 9 ngày, cộng thêm tính năng Xoay vòng tiền cọc trong ví khiến tiền nằm lại trên sàn suốt 30 đến 45 ngày, tài khoản ngân hàng của sàn luôn có một cục tiền mặt thường trực từ vài chục đến hàng trăm triệu đồng. Sàn giữ 40% ở tài khoản thanh toán hưởng lãi không kỳ hạn và đưa 60% phần vốn đáy ổn định vào tiền gửi kỳ hạn ngắn 7 đến 14 ngày xoay vòng để thu lãi tài chính.", space_after=5)

    add_para(
        doc,
        "2. Chi phí của sàn đến từ đâu? Không thuê mặt bằng gạch đá ngoài đường thì phải trả tiền thuê Mặt bằng số mỗi ngày:",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Một câu hỏi rất thực tế của dân kinh tế là: các tiệm cho thuê váy ở đường Hermann hay Nguyễn Đức Cảnh (TP. Vinh) phải trả từ 5.000.000đ đến 12.000.000đ/tháng tiền thuê nhà, tiền điện điều hòa, tiền nhân viên trông cửa hàng; còn CLOOP bảo không tốn tiền thuê mặt bằng truyền thống, vậy chi phí nằm ở đâu?", space_after=3)
    add_para(doc, "- Câu trả lời là: CLOOP thay thế mặt bằng gạch đá bằng Mặt bằng số (Digital Storefront). Dù ngày hôm đó có đơn hàng hay không có đơn hàng nào, mỗi ngày mở mắt ra sàn vẫn phải trả tiền duy trì Mặt bằng số, bao gồm 2 nhóm chi phí rõ ràng:", space_after=3)

    add_bw_table(
        doc,
        [
            "Khoản mục chi phí thuê Mặt bằng số và vận hành",
            "Chi phí tính theo tháng",
            "Quy đổi ra tiền phải trả mỗi ngày",
            "Bản chất kinh tế đời thường"
        ],
        [
            [
                "- Khoản 1: Thuê máy chủ đám mây (Cloud Server) và Cơ sở dữ liệu chạy 24/24",
                "700.000đ / tháng",
                "23.333đ / ngày",
                "+ Giống như tiền thuê đất và khung nhà trên mạng để hàng nghìn sinh viên vào xem váy cùng lúc không bị sập web"
            ],
            [
                "- Khoản 2: Thuê kho chứa ảnh, video kiểm chứng 2 đầu (Cloud Storage) và Tên miền",
                "500.000đ / tháng",
                "16.667đ / ngày",
                "+ Giống như tiền mua tủ kính và camera an ninh vì mọi đơn hàng đều bắt buộc lưu ảnh chụp thật trước và sau khi đóng gói"
            ],
            [
                "- Khoản 3: Duy trì cổng thanh toán QR tự động, phần mềm đối soát và tin nhắn báo đơn",
                "800.000đ / tháng",
                "26.667đ / ngày",
                "+ Giống như tiền thuê thu ngân tự động làm việc 24/24 để gạch nợ ngân hàng và nhắn tin báo cho chủ tủ đi gửi hàng"
            ],
            [
                "- Khoản 4: Chi phí kéo khách vào Mặt bằng số (Marketing cộng đồng SV Vinh) và trực hỗ trợ",
                "1.500.000đ / tháng",
                "50.000đ / ngày",
                "+ Cửa hàng ngoài đường có người đi qua nhìn thấy, còn mặt bằng trên mạng phải chạy truyền thông hội nhóm thì khách mới biết mà vào"
            ],
            [
                "- Tổng định phí Mặt bằng số cố định hàng tháng",
                "3.500.000đ / tháng",
                "116.667đ / ngày\n(Làm tròn 117.000đ/ngày)",
                "+ Rẻ hơn từ 60% đến 70% so với thuê mặt bằng cửa hàng vật lý tại TP. Vinh (5 đến 12 triệu/tháng)"
            ],
            [
                "- Biến phí phát sinh thêm trên từng đơn hàng thành công",
                "1.000đ đến 1.200đ / đơn",
                "Chỉ tốn khi có đơn",
                "+ Gồm trích 5% doanh thu phí vào Quỹ dự phòng rủi ro (750đ đến 900đ/đơn) cộng với 250đ đến 300đ băng thông tải ảnh và gọi bưu tá của đơn đó"
            ]
        ]
    )

    add_para(
        doc,
        "3. Trong 5 đến 9 ngày tiền đơn hàng đang bị ứ đọng trong két (chưa được rút 12% phí hoa hồng ra tiêu), lấy tiền đâu để trả 117.000đ/ngày tiền Cloud và mặt bằng số?",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Đây chính là bài toán lệch pha dòng tiền (Working Capital Timing Gap) trong tài chính doanh nghiệp: đơn hàng phải mất từ 5 đến 9 ngày mới hoàn tất vòng quay để mở khóa khoản phí hoa hồng 18.000đ, nhưng chi phí Mặt bằng số 117.000đ/ngày vẫn đang chạy từng ngày. Sàn CLOOP hóa giải bài toán này bằng 4 cơ chế nối tiếp nhau:", space_after=3)
    add_para(doc, "+ Cơ chế 1 (Lấy tiền tươi từ gói Lá đẩy Top nuôi chi phí hàng ngày): Như đã phân tích ở trên, tiền chủ tủ nạp mua gói Lá và bấm Đẩy Top hiển thị (từ 20.000đ đến 100.000đ/gói) không bị nhốt vào két giữ cọc 5 đến 9 ngày mà chảy thẳng vào quỹ tiền mặt sử dụng ngay của sàn. Như vậy, mỗi ngày trên toàn sàn chỉ cần có từ 2 đến 3 chủ tủ mua gói đẩy Top (hoặc khoảng 12 lượt bấm đẩy lẻ 10.000đ) là sàn đã thu ngay được 120.000đ đến 150.000đ tiền mặt tươi trong ngày, đủ trả đứt 117.000đ/ngày tiền Cloud và truyền thông mà chưa cần đụng tới tiền phí hoa hồng đang nằm trong két!", space_after=3)
    add_para(doc, "+ Cơ chế 2 (Tận dụng chu kỳ thu tiền trả sau 30 ngày của các hãng Cloud): Các nhà cung cấp hạ tầng mặt bằng số (như máy chủ đám mây, cơ sở dữ liệu, tên miền) không bắt sàn phải nộp 40.000đ tiền mặt vào mỗi buổi sáng, mà họ chốt hóa đơn thu tiền theo chu kỳ 30 ngày một lần vào cuối tháng. Trong khi đó, vòng quay bị giam vốn của một đơn thuê váy chỉ kéo dài từ 5 đến 9 ngày. Điều này có nghĩa là trong suốt 30 ngày của tháng đó, tiền phí hoa hồng 12% của 3 đến 4 đợt đơn hàng liên tiếp đã kịp mở khóa chảy về túi của sàn (đợt 1 mở khóa vào ngày thứ 7, đợt 2 vào ngày thứ 14, đợt 3 vào ngày thứ 21, đợt 4 vào ngày thứ 28) để sẵn sàng thanh toán hóa đơn Cloud vào ngày thứ 30!", space_after=3)
    add_para(doc, "+ Cơ chế 3 (Dùng chính cục tiền cọc đang nằm trong ngân hàng để tạo lợi tức phụ trợ): Tuy trên sổ kế toán của sàn, khoản tiền cọc 800.000đ/đơn đang bị khóa không được đem đi tiêu xài, nhưng về mặt vật lý thì toàn bộ số tiền mặt đó vẫn đang nằm trong tài khoản ngân hàng đứng tên sàn CLOOP. Nhờ tính năng Xoay vòng tiền cọc trong ví qua nhiều đơn, tổng số dư tiền mặt nằm trong ngân hàng luôn duy trì ở mức cao, giúp sàn được ngân hàng miễn toàn bộ phí quản lý tài khoản, phí chuyển tiền và trả lãi tiền gửi đều đặn hàng tháng để bù đắp một phần hóa đơn máy chủ.", space_after=3)
    add_para(doc, "+ Cơ chế 4 (Quỹ vốn lưu động mồi 15 ngày đầu tiên khi mới khai trương): Để tuyệt đối an toàn trong 9 ngày đầu tiên khi mới bấm nút khai trương sàn (lúc lứa đơn hàng đầu tiên đang mặc đi tiệc chưa trả váy), nhóm sáng lập chỉ cần bỏ sẵn vào tài khoản vận hành một khoản vốn lưu động đệm đúng 15 ngày bằng: 15 ngày nhân 117.000đ/ngày = 1.755.000đ (làm tròn 1.800.000đ). Kể từ ngày thứ 10 trở đi, các đơn hàng đặt từ ngày 1 bắt đầu hoàn tất trả đồ và nhả phí hoa hồng 12% ra đều đặn mỗi ngày, tạo thành vòng tuần hoàn tự nuôi sống bộ máy vĩnh viễn.", space_after=6)

    add_para(
        doc,
        "4. Tính toán cụ thể: Cần tối thiểu bao nhiêu đơn hàng mỗi ngày và mỗi tháng để đạt Điểm hòa vốn (Break-Even Point)?",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Công thức tính Điểm hòa vốn trong kinh tế học rất rõ ràng: lấy Tổng chi phí cố định Mặt bằng số (3.500.000đ/tháng, tương đương 116.667đ/ngày) chia cho Tiền lời ròng sàn bỏ túi được trên mỗi đơn hàng (sau khi đã lấy phí hoa hồng 12% trừ đi 5% trích quỹ dự phòng rủi ro và biến phí xử lý đơn). Dưới đây là con số tối thiểu tính cho cả 2 mức giá thuê trong file Excel của bạn:", space_after=4)

    add_bw_table(
        doc,
        [
            "Chỉ tiêu tính số đơn hàng tối thiểu và Điểm hòa vốn",
            "Phương án 1: Giá thuê 150.000đ/đơn\n(Khớp Phần 1 Sheet 3 file Excel)",
            "Phương án 2: Giá thuê 125.000đ/đơn\n(Khớp Phần 4 Sheet 3 gói 139.000đ)"
        ],
        [
            [
                "- Tổng tiền khách thực trả (Giá thuê + 14.000đ ship chiều đi)",
                "164.000đ / đơn",
                "139.000đ / đơn"
            ],
            [
                "- Doanh thu phí hoa hồng sàn thu về (12% nhân Giá thuê)",
                "18.000đ / đơn",
                "15.000đ / đơn"
            ],
            [
                "- Trừ biến phí mỗi đơn (5% quỹ dự phòng rủi ro + băng thông tải ảnh)",
                "1.200đ / đơn\n(900đ dự phòng + 300đ băng thông)",
                "1.000đ / đơn\n(750đ dự phòng + 250đ băng thông)"
            ],
            [
                "- Tiền lời ròng sàn thực bỏ túi trên 1 đơn (Lợi nhuận góp)",
                "16.800đ / đơn",
                "14.000đ / đơn"
            ],
            [
                "- Số đơn tối thiểu MỖI NGÀY để Hòa vốn nếu chỉ tính riêng phí 12% (lấy 116.667đ/ngày chia tiền lời 1 đơn)",
                "Tối thiểu 6,94 đơn / ngày\n(Làm tròn: 7 đơn / ngày)",
                "Tối thiểu 8,33 đơn / ngày\n(Làm tròn: 8 đến 9 đơn / ngày)"
            ],
            [
                "- Số đơn tối thiểu MỖI THÁNG để Hòa vốn nếu chỉ tính riêng phí 12% (lấy 3.500.000đ/tháng chia tiền lời 1 đơn)",
                "Tối thiểu 209 đơn / tháng\n(Tổng tiền thuê qua sàn: 31,35 triệu)",
                "Tối thiểu 250 đơn / tháng\n(Tổng tiền thuê qua sàn: 31,25 triệu)"
            ],
            [
                "- Số đơn tối thiểu khi CỘNG THÊM tiền bán gói Lá đẩy Top và lãi vốn lưu đọng (thu phụ trợ 800.000đ/tháng = 26.667đ/ngày)",
                "+ Theo ngày: Chỉ cần 5,4 đơn / ngày\n+ Theo tháng: Tối thiểu 161 đơn / tháng\n(Đạt mục tiêu 180 đơn ở Sheet 3 là sàn đã có lãi ròng!)",
                "+ Theo ngày: Chỉ cần 6,4 đơn / ngày\n+ Theo tháng: Tối thiểu 193 đơn / tháng"
            ],
            [
                "- Quy đổi ra số lượng chiếc váy cần có trên sàn (với tốc độ quay vòng trung bình 3,45 lần/tháng ở Sheet 1)",
                "+ Chỉ cần từ 47 đến 61 chiếc váy đang cho thuê trên sàn (tương đương 15 đến 20 chủ tủ, mỗi người đăng 3 chiếc váy)",
                "+ Chỉ cần từ 56 đến 72 chiếc váy đang cho thuê trên sàn"
            ]
        ]
    )

    # =========================================================================
    # PHẦN V: VÌ SAO FILE WORD CỦA CÔ LAM (722 NGƯỜI) VÀ FILE EXCEL CỦA BẠN (320 MẪU) KHỚP NHAU?
    # =========================================================================
    add_para(
        doc,
        "Phần V. Sự ăn khớp tuyệt đối giữa khảo sát nghiên cứu khoa học của cô Lam (722 người) và dữ liệu thực tế của bạn (200 sản phẩm, 120 bình luận)",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=10,
        space_after=4
    )

    add_para(
        doc,
        "1. Giải thích phát hiện quan trọng nhất bằng ngôn ngữ kinh tế bình dị:",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Trong bài khảo sát 722 người tiêu dùng của cô Lam (chạy mô hình thống kê SEM):", space_after=2)
    add_para(doc, "+ Khi xét tác động trực tiếp từ Giao diện web dễ dùng, thông tin rõ ràng (PC) sang Hành vi đặt thuê đồ (CFCB) ở giả thuyết H4: kết quả ra con số âm (-0,026) và mức ý nghĩa p = 0,762 (lớn hơn 0,05 nên bị bác bỏ hoàn toàn). Nói một cách bình dân dễ hiểu: dù bạn có thuê lập trình viên làm ra trang web đẹp long lanh, bấm mượt đến mấy thì tự bản thân cái web đẹp đó cũng không làm khách chịu móc hầu bao đi thuê đồ.", space_after=2)
    add_para(doc, "+ Ngược lại, khi đi theo con đường vòng ở giả thuyết H6: từ Giao diện tốt (PC) tạo ra Lợi ích kinh tế tiết kiệm tiền (CFPV, đạt 0,868, trong đó Lợi ích kinh tế EV cao nhất đạt 0,938), rồi từ Lợi ích đó xây dựng được Niềm tin vào sự bảo vệ của sàn (PT, đạt 0,859), và từ Niềm tin mới dẫn tới Hành vi đặt thuê đồ (CFCB, đạt 0,677) thì kết quả lại được chấp nhận cực mạnh (tác động chuỗi đạt 0,505, p = 0,001).", space_after=3)

    add_para(doc, "- Vì sao lại như vậy? Bảng khảo sát 120 bình luận khách hàng thực tế tại TP. Vinh và Shopee trong file Excel của bạn trả lời chính xác nguyên nhân:", space_after=2)
    add_para(doc, "+ Có tới 38,33% khách hàng (46/120 người) sợ đi thuê váy vì tiền cọc quá cao (trung bình trên Shopee bắt cọc 569.456đ, tại tiệm ở Vinh bắt cọc 869.565đ hoặc giữ thẻ CCCD gắn chip gốc), trả đồ xong bị chủ tiệm ngâm cọc từ 3 đến 7 ngày và bị soi lỗi vặt trừ oan 100.000đ đến 200.000đ. Đây chính là lý do thiếu Niềm tin (PT).", space_after=2)
    add_para(doc, "+ Tiếp theo, có 29,17% khách hàng (35/120 người) bỏ cuộc vì tiền ship 2 chiều quá đắt (50.000đ đến 90.000đ, bằng gần nửa tiền thuê váy). Đây chính là lý do thiếu Lợi ích kinh tế (EV).", space_after=2)
    add_para(doc, "+ Như vậy, hai bộ số liệu chứng minh cho nhau một chân lý: muốn khách hàng thực sự thuê đồ (biến H4 thất bại thành H6 thành công), sàn CLOOP bắt buộc phải có Két giữ tiền cọc trung gian tự động + Xoay vòng ví (để tạo Niềm tin PT) và Chia đôi phí ship 14.000đ (để tạo Lợi ích kinh tế EV).", space_after=6)

    add_para(
        doc,
        "2. Bảng đối chiếu 1-1 giữa khảo sát của cô Lam (722 người) và khảo sát thực tế của bạn (200 sản phẩm, 120 bình luận):",
        bold=True,
        space_after=4
    )

    add_bw_table(
        doc,
        [
            "Yếu tố trong khảo sát 722 người (File Word cô Lam)",
            "Con số thống kê chứng minh",
            "Nỗi đau thực tế từ 120 bình luận và 200 sản phẩm (File Excel)",
            "Tính năng thực tế trên sàn CLOOP giải quyết"
        ],
        [
            [
                "- Nhóm 1: Giao diện dễ dùng (PIU) và Thông tin rõ ràng (PTY)",
                "+ Dễ dùng: 0,954\n+ Rõ ràng: 0,867\n+ Tác động thẳng sang thuê đồ (H4): -0,026 (Bị bác bỏ)",
                "+ 23/120 mẫu (19,17%): Mất 4 đến 12 giờ chờ chủ tiệm dò sổ tay, bị báo hủy đơn sát ngày kỷ yếu\n+ 16/120 mẫu (13,33%): Váy nhận về cũ nát, ám mùi khác ảnh mẫu",
                "+ Lịch đặt tự động khóa ngày ngay khi bấm thuê và tự chừa ngày giặt ủi\n+ Hồ sơ trang phục ghi rõ số lần đã mặc và ảnh chụp thật trước khi gửi"
            ],
            [
                "- Nhóm 2: Giá trị cảm nhận, đứng đầu là Lợi ích kinh tế (EV) và Tiện lợi (FCV)",
                "+ Lợi ích kinh tế (EV): 0,938 (Cao nhất)\n+ Tiện lợi (FCV): 0,926\n+ Tác động sang Niềm tin (H2): 0,859",
                "+ 35/120 mẫu (29,17%): Thuê qua Shopee chịu ship 2 chiều 55k đến 70k; mua đứt đồ cũ trên REshare tốn trung bình 281.867đ/váy; thuê tiệm ở Vinh tốn 200.000đ và 4 lượt đi lại",
                "+ Chia đôi phí ship 50/50: Khách chỉ trả chiều đi (14.000đ nội thành Vinh), chủ tủ trả chiều về. Tổng tiền thuê 3 ngày kèm ship chỉ hết 139.000đ (rẻ hơn 30% đến 50%)"
            ],
            [
                "- Nhóm 3: Niềm tin vào sàn trung gian (PT - Chốt chặn quyết định)",
                "+ Từ Lợi ích sang Niềm tin: 0,859\n+ Từ Niềm tin sang Hành vi thuê (H3): 0,677\n+ Chuỗi trung gian H6: 0,505",
                "+ 46/120 mẫu (38,33% - Lớn nhất): Bắt cọc 569.456đ (Shopee) đến 869.565đ (tiệm Vinh); gồm 22 mẫu ép cọc cao/giữ CCCD gốc, 13 mẫu ngâm cọc 3-7 ngày, 11 mẫu phạt cọc vô lý",
                "+ Sàn giữ tiền cọc ở két trung gian, xác thực thẻ sinh viên giảm cọc, bưu tá báo giao trả xong sau 24h là tự hoàn cọc\n+ Cho phép xoay vòng 800k cọc trong ví sang đơn mới với 6 lớp khóa chống tiền ảo"
            ],
            [
                "- Nhóm 4: Hành vi thuê đồ (ACQ), Giữ gìn (USE) và Cho thuê lại (F1)",
                "+ Cho thuê lại (F1): 0,849\n+ Đi thuê đồ (ACQ): 0,839\n+ Giữ gìn tăng tuổi thọ (USE): 0,780",
                "+ Trong 200 sản phẩm khảo sát: Bán đứt thanh lý 1 chiều (REshare, 30 mẫu) chỉ bán được 1 lần; trong khi cho thuê 2 chiều quay vòng 46,48 lần/váy trên Shopee và 61,30 lần/váy tại Vinh",
                "+ Mô hình C2C 2 chiều giúp khách đi thuê dễ dàng mang tủ váy của mình lên cho thuê lại, kéo dài vòng đời chiếc váy lên 45 đến 60 lần mặc"
            ]
        ]
    )

    # =========================================================================
    # PHẦN VI: BẢNG SỐ LIỆU CHUẨN TỪ 200 SẢN PHẨM VÀ KẾT QUẢ CHUẨN HÓA FILE EXCEL
    # =========================================================================
    add_para(
        doc,
        "Phần VI. Bảng thống kê 200 sản phẩm đối thủ và kết quả chuẩn hóa file Excel",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=10,
        space_after=4
    )

    add_para(
        doc,
        "1. Bảng tổng hợp số liệu từ 200 sản phẩm khảo sát thực tế (Sheet 1 file Excel):",
        bold=True,
        space_after=3
    )

    add_bw_table(
        doc,
        [
            "Nhóm đối thủ khảo sát (Tổng 200 mẫu)",
            "Số mẫu",
            "Giá mua mới trung bình (Trung vị)",
            "Giá thuê hoặc bán trung bình",
            "Tiền cọc bắt buộc trung bình",
            "Số lượt thuê/bán mỗi tháng",
            "Tổng số lượt đã quay vòng/váy"
        ],
        [
            [
                "- Nhóm 1: Cho thuê 2 chiều trên Shopee",
                "147",
                "696.054đ\n(650.000đ)",
                "155.918đ\n(160.000đ)",
                "569.456đ\n(550.000đ)",
                "3,45 lượt/tháng",
                "46,48 lượt/váy\n(4 đến 125 lượt)"
            ],
            [
                "- Nhóm 2: Cho thuê tại tiệm ở TP. Vinh",
                "23",
                "869.565đ\n(750.000đ)",
                "150.435đ\n(150.000đ)",
                "869.565đ\n(750.000đ)",
                "6,39 lượt/tháng",
                "61,30 lượt/váy\n(30 đến 78 lượt)"
            ],
            [
                "- Nhóm 3: Bán thanh lý 1 chiều (REshare)",
                "30",
                "881.333đ\n(790.000đ)",
                "281.867đ\n(261.000đ)",
                "0đ (Bán đứt)",
                "1,00 lượt/tháng",
                "1,00 lượt/váy\n(Chỉ bán 1 lần)"
            ],
            [
                "- Toàn bộ 200 sản phẩm khảo sát",
                "200",
                "743.800đ\n(720.000đ)",
                "174.180đ\n(160.000đ)",
                "518.550đ\n(540.000đ)",
                "3,42 lượt/tháng",
                "41,37 lượt/váy"
            ]
        ]
    )

    add_para(
        doc,
        "2. Hai điểm lệch công thức nhỏ trong file Dữ liệu.xlsx đã được sửa sạch sẽ:",
        bold=True,
        space_after=3
    )
    add_para(doc, "- Điểm thứ nhất ở Sheet 3 (Phần 3, dòng 23 đến 27): Công thức cộng tổng hàng ngang đang bị nhảy lệch xuống 1 dòng làm hiện lỗi #DIV/0!. Hệ thống đã chỉnh lại đúng dòng để hiện chuẩn 46 mẫu (38,33%), 35 mẫu (29,17%), 23 mẫu (19,17%), 16 mẫu (13,33%), tổng cộng đúng 120 mẫu (100%).", space_after=3)
    add_para(doc, "- Điểm thứ hai ở Sheet 4 (Cột số lượng mẫu của 6 lỗ hổng): Con số gõ tay cũ là 20, 14, 14, 35, 23, 14 đã được chỉnh lại thành 22, 13, 11, 35, 23, 16 để khớp 100% với từng dòng đếm trên Sheet 2 và Sheet 3.", space_after=5)

    add_para(
        doc,
        "- Lưu ý khi vận hành kỹ thuật: Trước khi đưa tính năng thanh toán ví lên môi trường chạy thật, hãy chạy kiểm tra thử ở máy cá nhân (Local) để đối chiếu sổ kế toán.",
        italic=True,
        space_before=4,
        space_after=4
    )

    # LƯU VÀO DOWNLOADS
    downloads_dir = r"C:\Users\Yoga gen 3\Downloads"
    p_clean = os.path.join(downloads_dir, "Bao_Cao_Tom_Gon_Kinh_Te_CLOOP_Chuan_In.docx")
    p_new = os.path.join(downloads_dir, "Bao_Cao_Tom_Gon_Kinh_Te_Dong_Tien_Va_Mo_Hinh_CLOOP.docx")
    p_main = os.path.join(downloads_dir, "Bao_Cao_Mach_Van_Hanh_Diem_Nghen_Va_Vi_Noi_Bo_CLOOP.docx")
    p_old1 = os.path.join(downloads_dir, "Bao_Cao_Ky_Thuat_Luan_Chuyen_So_Du_Vi_CLOOP_Kem_So_Do.docx")
    p_old2 = os.path.join(downloads_dir, "Bao_Cao_Ky_Thuat_Luan_Chuyen_So_Du_Vi_CLOOP.docx")
    workspace_path = os.path.join(os.getcwd(), "Bao_Cao_Tom_Gon_Kinh_Te_CLOOP_Chuan_In.docx")
    artifact_docx = r"C:\Users\Yoga gen 3\.gemini\antigravity\brain\b7761dca-3bfb-4045-a8b7-a1e0d79faaa8\Bao_Cao_Ky_Thuat_Luan_Chuyen_So_Du_Vi_CLOOP.docx"

    doc.save(workspace_path)
    for target_p in [p_clean, p_new, p_main, p_old1, p_old2, artifact_docx]:
        try:
            shutil.copyfile(workspace_path, target_p)
            print("Saved to:", target_p)
        except Exception as e:
            print("Could not overwrite (open in Word):", target_p, str(e))


if __name__ == "__main__":
    build_report()
