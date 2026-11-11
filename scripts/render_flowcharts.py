import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib import font_manager

font_path_reg = r"C:\Windows\Fonts\times.ttf"
font_path_bold = r"C:\Windows\Fonts\timesbd.ttf"
font_path_italic = r"C:\Windows\Fonts\timesi.ttf"

prop_reg = font_manager.FontProperties(fname=font_path_reg)
prop_bold = font_manager.FontProperties(fname=font_path_bold)
prop_italic = font_manager.FontProperties(fname=font_path_italic)

out_dir = os.path.join(os.getcwd(), "public", "diagrams")
os.makedirs(out_dir, exist_ok=True)


def draw_bw_box(ax, x, y, w, h, title, lines, lw=1.6, linestyle="-"):
    rect = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.003,rounding_size=0.012",
        linewidth=lw,
        linestyle=linestyle,
        edgecolor="#000000",
        facecolor="#FFFFFF",
        zorder=2
    )
    ax.add_patch(rect)

    title_y = y + h - 0.028
    ax.text(
        x + w / 2, title_y, title,
        fontproperties=prop_bold, fontsize=11, color="#000000",
        ha="center", va="top", zorder=3
    )

    line_y = title_y - 0.032
    ax.plot([x + 0.012, x + w - 0.012], [line_y, line_y], color="#000000", lw=0.8, zorder=3)

    n = len(lines)
    if n > 0:
        avail_h = (line_y - y) - 0.018
        step = min(0.033, avail_h / max(n, 1))
        start_y = line_y - 0.014
        for i, line in enumerate(lines):
            ax.text(
                x + 0.016, start_y - i * step, line,
                fontproperties=prop_reg, fontsize=10, color="#000000",
                ha="left", va="top", zorder=3
            )


def draw_bw_arrow(ax, x1, y1, x2, y2):
    ax.annotate(
        "",
        xy=(x2, y2), xycoords="data",
        xytext=(x1, y1), textcoords="data",
        arrowprops=dict(
            arrowstyle="-|>,head_length=0.6,head_width=0.35",
            color="#000000",
            lw=1.5,
            shrinkA=2, shrinkB=2
        ),
        zorder=4
    )


def render_diagram_1_cashflow_bw():
    fig, ax = plt.subplots(figsize=(15.5, 11.2), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(
        0.5, 0.968,
        "Sơ đồ 1: Mạch dòng tiền ra vào, két giữ tiền trung gian và 4 trường hợp chia tiền",
        fontproperties=prop_bold, fontsize=14.5, color="#000000", ha="center", va="top"
    )
    ax.text(
        0.5, 0.938,
        "Mô hình sàn trung gian C2C: Sàn không bỏ vốn nhập hàng, chỉ đứng giữa giữ tiền bảo đảm cho khách và chủ tủ",
        fontproperties=prop_italic, fontsize=11, color="#000000", ha="center", va="top"
    )

    draw_bw_box(
        ax, 0.03, 0.76, 0.29, 0.14,
        "Nguồn tiền vào 1: Tiền đơn thuê đồ",
        [
            "- Khách trả: Tiền thuê + Tiền cọc + Ship đi",
            "- Thanh toán qua mã QR hoặc số dư ví",
            "- Chiếm tỷ trọng dòng tiền lớn nhất sàn"
        ]
    )

    draw_bw_box(
        ax, 0.355, 0.76, 0.29, 0.14,
        "Nguồn tiền vào 2: Xác thực 2.000đ",
        [
            "- Khách chuyển 2.000đ xác nhận chính chủ",
            "- Sàn cộng trả nguyên 2.000đ vào ví khách",
            "- Giúp chống chuyển nhầm hoặc rửa tiền"
        ]
    )

    draw_bw_box(
        ax, 0.68, 0.76, 0.29, 0.14,
        "Nguồn tiền vào 3: Nạp Lá đẩy Top",
        [
            "- Chủ tủ mua gói hiển thị ưu tiên (20k-100k)",
            "- Đây là doanh thu dịch vụ ăn ngay của sàn",
            "- Không phải hoàn lại như tiền cọc"
        ]
    )

    draw_bw_box(
        ax, 0.10, 0.53, 0.80, 0.16,
        "Két giữ tiền trung gian của sàn CLOOP (Giữ tiền từ 5 đến 9 ngày mỗi đơn)",
        [
            "- Toàn bộ tiền khách đóng được khóa trong tài khoản ngân hàng của sàn suốt thời gian giao hàng và mặc đồ",
            "- Nguyên tắc cân bằng: Tổng tiền thu vào = Tiền trả lại cọc + Tiền trả chủ tủ + Phí sàn (12%) + Tiền vận chuyển",
            "- Khoản tiền nằm chờ 5 đến 9 ngày này tạo thành nguồn vốn lưu đọng (Cash Float) giúp sàn chủ động thanh khoản"
        ],
        lw=2.0
    )

    draw_bw_arrow(ax, 0.175, 0.76, 0.30, 0.69)
    draw_bw_arrow(ax, 0.50, 0.76, 0.50, 0.69)
    draw_bw_arrow(ax, 0.825, 0.76, 0.70, 0.69)

    draw_bw_box(
        ax, 0.02, 0.25, 0.225, 0.21,
        "Nhánh 1: Đơn hoàn tất êm đẹp",
        [
            "- Sau 24h trả đồ không ai khiếu nại:",
            "+ Hoàn 100% tiền cọc về ví khách",
            "+ Trả chủ tủ: Giá thuê trừ 12% phí",
            "  và trừ 25.000đ ship chiều trả về",
            "+ Sàn thu: 12% phí hoa hồng"
        ]
    )

    draw_bw_box(
        ax, 0.265, 0.25, 0.225, 0.21,
        "Nhánh 2: Chủ tủ ngâm đơn quá 48h",
        [
            "- Quá 2 ngày chủ tủ không gửi hàng:",
            "+ Hệ thống tự động hủy đơn hàng",
            "+ Hoàn trả 100% toàn bộ tiền đã",
            "  đóng (Thuê + Cọc + Ship) về ví",
            "  để khách đi thuê chiếc váy khác"
        ]
    )

    draw_bw_box(
        ax, 0.51, 0.25, 0.225, 0.21,
        "Nhánh 3: Khiếu nại chia 3 cấp độ",
        [
            "- Cấp 1 (Bẩn nhẹ/nhăn): Trừ 0đ cọc",
            "- Cấp 2 (Rách sửa được): Trừ tối đa",
            "  50% cọc đền chủ tủ, cọc dư trả khách",
            "- Cấp 3 (Hỏng hẳn/mất): Đền 100% cọc",
            "- Lỗi chủ tủ: Hoàn 100% cọc + tiền thuê"
        ]
    )

    draw_bw_box(
        ax, 0.755, 0.25, 0.225, 0.21,
        "Nhánh 4: Chốt doanh thu sàn",
        [
            "- Cuối tháng sàn tổng kết doanh thu:",
            "+ Phí hoa hồng 12% trên giá thuê",
            "+ Doanh thu bán gói Lá đẩy Top",
            "+ Trích 5% doanh thu lập Quỹ dự",
            "  phòng rủi ro để bù sự cố phát sinh"
        ]
    )

    draw_bw_arrow(ax, 0.28, 0.53, 0.132, 0.46)
    draw_bw_arrow(ax, 0.43, 0.53, 0.377, 0.46)
    draw_bw_arrow(ax, 0.57, 0.53, 0.622, 0.46)
    draw_bw_arrow(ax, 0.72, 0.53, 0.867, 0.46)

    draw_bw_box(
        ax, 0.03, 0.03, 0.44, 0.16,
        "Hướng đi A: Dùng lại tiền cọc trong ví để thuê đơn mới (Khuyên dùng)",
        [
            "- Khách dùng ngay 800.000đ tiền cọc vừa hoàn về ví để đặt chiếc váy tiếp theo",
            "- Chỉ cần quét QR trả thêm 200.000đ tiền thuê mới (không phải nạp lại cả 1 triệu)",
            "- Tiền mặt thật nằm lại 100% trong ngân hàng của sàn qua nhiều vòng thuê"
        ],
        lw=2.0
    )

    draw_bw_box(
        ax, 0.53, 0.03, 0.44, 0.16,
        "Hướng đi B: Rút tiền mặt từ ví về tài khoản ngân hàng cá nhân",
        [
            "- Khi khách không có nhu cầu thuê tiếp hoặc chủ tủ muốn rút tiền doanh thu",
            "- Hệ thống đối chiếu số tiền thật đã nạp vào trước đây rồi chuyển khoản trả",
            "- Tiền mặt chính thức rời khỏi tài khoản ngân hàng của sàn"
        ]
    )

    draw_bw_arrow(ax, 0.132, 0.25, 0.22, 0.19)
    draw_bw_arrow(ax, 0.377, 0.25, 0.28, 0.19)
    draw_bw_arrow(ax, 0.622, 0.25, 0.58, 0.19)

    p1 = os.path.join(out_dir, "so_do_1_mach_dong_tien_tong_the.png")
    plt.tight_layout()
    plt.savefig(p1, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print("Saved Diagram 1:", p1)


def render_diagram_2_bottlenecks_bw():
    fig, ax = plt.subplots(figsize=(15.5, 11.8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(
        0.5, 0.97,
        "Sơ đồ 2: Sáu bước vận hành một đơn hàng và 7 điểm nghẽn thực tế cần khóa chặt",
        fontproperties=prop_bold, fontsize=14.5, color="#000000", ha="center", va="top"
    )
    ax.text(
        0.5, 0.94,
        "Nhận diện đúng các chỗ dễ tắc nghẽn tiền bạc, hàng hóa ngoài đời thực và cách sàn xử lý tự động",
        fontproperties=prop_italic, fontsize=11, color="#000000", ha="center", va="top"
    )

    draw_bw_box(
        ax, 0.03, 0.70, 0.285, 0.20,
        "Bước 1: Khách bấm đặt đơn",
        [
            "- Khóa lịch chiếc váy để không ai đặt trùng",
            "- Nghẽn số 4: Khách mở mã QR lên xem rồi",
            "  tắt máy bỏ đi làm chiếc váy bị khóa lịch",
            "  mất 15 phút không khách nào khác thuê được"
        ]
    )

    draw_bw_box(
        ax, 0.357, 0.70, 0.285, 0.20,
        "Bước 2: Chủ tủ chuẩn bị đồ (48h)",
        [
            "- Chủ tủ kiểm tra váy và đóng gói giao ship",
            "- Nghẽn số 7: Chủ tủ bận việc quên xác nhận",
            "  hoặc báo hết đồ làm tiền của khách bị giam",
            "  tối đa 48 giờ trước khi hệ thống tự hủy"
        ]
    )

    draw_bw_box(
        ax, 0.685, 0.70, 0.285, 0.20,
        "Bước 3: Giao nhận 2 chiều",
        [
            "- Giao qua bưu tá tiêu chuẩn hoặc giao nhanh",
            "- Nghẽn số 1: Tiền ship chiều trả về đang",
            "  thu cố định 25.000đ; nếu đơn ở xa phí ship",
            "  thực tế cao hơn thì sàn phải bù phần lệch"
        ]
    )

    draw_bw_arrow(ax, 0.315, 0.80, 0.357, 0.80)
    draw_bw_arrow(ax, 0.642, 0.80, 0.685, 0.80)

    draw_bw_box(
        ax, 0.685, 0.43, 0.285, 0.20,
        "Bước 4: Khách mặc xong gửi trả",
        [
            "- Bưu tá lấy đồ mang trả lại cho chủ tủ",
            "- Nghẽn số 2: Chủ tủ đã nhận lại váy nhưng",
            "  quên vào web bấm xác nhận, làm tiền cọc",
            "  của khách bị treo không giải ngân được"
        ]
    )

    draw_bw_box(
        ax, 0.357, 0.43, 0.285, 0.20,
        "Bước 5: Kiểm tra đồ trong 24h",
        [
            "- Chủ tủ có 24 giờ kiểm tra vết bẩn, rách",
            "- Nghẽn số 5: Khi hai bên cãi nhau về lỗi",
            "  rách váy, toàn bộ tiền bị đóng băng chờ",
            "  sàn đối chiếu video mở hộp theo 3 cấp độ"
        ]
    )

    draw_bw_box(
        ax, 0.03, 0.43, 0.285, 0.20,
        "Bước 6: Hoàn cọc và rút tiền",
        [
            "- Tiền cọc trả về ví nội bộ của khách thuê",
            "- Nghẽn số 3: Duyệt rút tiền thủ công tốn công",
            "- Nghẽn số 6: Khách bị chôn 1,8 triệu nếu",
            "  thuê đơn 2 nên sẽ rút sạch tiền khỏi sàn"
        ]
    )

    draw_bw_arrow(ax, 0.827, 0.70, 0.827, 0.63)
    draw_bw_arrow(ax, 0.685, 0.53, 0.642, 0.53)
    draw_bw_arrow(ax, 0.357, 0.53, 0.315, 0.53)

    draw_bw_box(
        ax, 0.03, 0.03, 0.94, 0.34,
        "Cách sàn CLOOP đã giải quyết triệt để cả 7 điểm nghẽn trên",
        [
            "- Giải quyết nghẽn 1 (Lệch phí ship): Cộng sẵn biên độ dự phòng 10% làm tròn 5.000đ ở chiều đi; tại nội thành Vinh chia sẻ ship 14.000đ/chiều",
            "- Giải quyết nghẽn 2 (Chủ tủ quên bấm nhận đồ): Hệ thống tự động hỏi dữ liệu bưu cục GHN/GHTK, thấy báo Đã giao là tự đếm 24h trả cọc cho khách",
            "- Giải quyết nghẽn 3 & 6 (Chôn vốn 1,8 triệu và rút tiền): Cho phép dùng ngay 800.000đ cọc trong ví để đặt đơn mới, giảm 80% lệnh rút tiền lặt vặt",
            "- Giải quyết nghẽn 4 (Khách xem QR rồi tắt máy): Ngay khi khách bấm đóng bảng mã QR, hệ thống hủy đơn nháp và mở khóa lịch thuê ngay trong 0,1 giây",
            "- Giải quyết nghẽn 5 (Tranh chấp hư hỏng): Chia 3 cấp độ rõ ràng (Cấp 1 bẩn nhẹ: 0đ; Cấp 2 sửa được: tối đa 50% cọc; Cấp 3 hỏng hẳn: tới 100% cọc) kèm video mở hộp",
            "- Giải quyết nghẽn 7 (Vốn lưu đọng 5 đến 9 ngày): Giữ tiền cọc xoay vòng qua 3 đến 4 lượt thuê liên tiếp, phân bổ 60% vốn nhàn rỗi gửi kỳ hạn ngắn sinh lời"
        ],
        lw=2.0
    )

    p2 = os.path.join(out_dir, "so_do_2_mach_van_hanh_va_7_diem_nghen.png")
    plt.tight_layout()
    plt.savefig(p2, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print("Saved Diagram 2:", p2)


def render_diagram_3_wallet_bw():
    fig, ax = plt.subplots(figsize=(15.5, 11.2), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(
        0.5, 0.968,
        "Sơ đồ 3: Cơ chế dùng lại tiền cọc trong ví để thuê đơn mới và 6 lớp khóa chống gian lận",
        fontproperties=prop_bold, fontsize=14.5, color="#000000", ha="center", va="top"
    )
    ax.text(
        0.5, 0.938,
        "Giải quyết bài toán: Có 800.000đ cọc cũ trong ví, muốn thuê đơn mới 1.000.000đ thì chỉ cần quét QR bù thêm 200.000đ",
        fontproperties=prop_italic, fontsize=11, color="#000000", ha="center", va="top"
    )

    draw_bw_box(
        ax, 0.10, 0.79, 0.80, 0.12,
        "Tình huống thực tế tại trang Thanh toán (Checkout)",
        [
            "- Đơn 1 hoàn tất, khách được hoàn 800.000đ tiền cọc vào ví. Tuần sau khách đặt Đơn 2 cũng hết 1.000.000đ (200k thuê + 800k cọc)",
            "- Khách bật nút Dùng số dư ví: Hệ thống dùng luôn 800.000đ cọc cũ trong ví, khách chỉ cần quét QR trả thêm đúng 200.000đ tiền thuê mới"
        ]
    )

    draw_bw_box(
        ax, 0.05, 0.59, 0.90, 0.15,
        "Lớp khóa 1, 2 và 3: Kiểm tra tiền thật từ ngân hàng và chống bấm nhiều tab cùng lúc",
        [
            "- Lớp khóa 1 (Truy nguồn tiền gốc): Hệ thống không tin con số hiển thị trên màn hình mà cộng lại toàn bộ biên lai ngân hàng thực tế từ đầu",
            "- Lớp khóa 2 (Chặn số dư khống): Nếu kẻ gian sửa trộm số dư ví lên 5 triệu mà không có biên lai nạp tiền thật, hệ thống chặn đứng ngay lập tức",
            "- Lớp khóa 3 (Xếp hàng từng giao dịch): Khóa tài khoản trong 0,1 giây xử lý để khách không thể mở 10 tab trình duyệt tiêu cùng 1 khoản tiền hai lần"
        ],
        lw=1.8
    )

    draw_bw_arrow(ax, 0.5, 0.79, 0.5, 0.74)

    draw_bw_box(
        ax, 0.05, 0.40, 0.90, 0.14,
        "Lớp khóa 4, 5 và 6: Niêm phong phiếu giữ tiền và kiểm tra khớp tổng tiền khi quét QR",
        [
            "- Lớp khóa 4 (Tự hoàn ví khi đổi ý): Nếu khách mở mã QR 200.000đ lên nhưng bấm tắt không quét nữa, 800.000đ được trả lại ví ngay tức thì",
            "- Lớp khóa 5 (Giữ mức quét tối thiểu 2.000đ): Tự động căn chỉnh để phần tiền quét QR ngân hàng không bao giờ bị lẻ dưới mức 2.000đ",
            "- Lớp khóa 6 (Khớp đúng tổng hóa đơn): Chỉ khi Tiền quét QR mới (200k) + Tiền ví đã khóa (800k) = Đúng 1.000.000đ thì đơn hàng mới được duyệt"
        ],
        lw=1.8
    )

    draw_bw_arrow(ax, 0.5, 0.59, 0.5, 0.54)

    draw_bw_box(
        ax, 0.04, 0.05, 0.44, 0.28,
        "Lợi ích cho Khách thuê và Chủ tủ",
        [
            "- Khách thuê không bị chôn 1.800.000đ tiền mặt cho",
            "  2 đơn hàng liên tiếp, chỉ cần bỏ ra 1 lần tiền cọc",
            "  800.000đ là xoay vòng mặc được nhiều bộ váy khác nhau",
            "- Chủ tủ cũng có thể dùng luôn tiền doanh thu cho thuê",
            "  đồ trong ví để đi thuê váy của chủ tủ khác trong 1 giây",
            "- Không phải chờ đợi lệnh rút tiền về ngân hàng"
        ]
    )

    draw_bw_box(
        ax, 0.52, 0.05, 0.44, 0.28,
        "Lợi ích tài chính cho Sàn CLOOP",
        [
            "- Giữ chân khách hàng ở lại thuê tiếp đơn thứ 2, thứ 3",
            "  thay vì rút tiền cọc ra rồi rời bỏ sàn",
            "- Giữ nguyên 100% tiền mặt thật (Cash Float) nằm trong",
            "  tài khoản ngân hàng của sàn suốt 30 đến 45 ngày",
            "- Giảm tới 80% khối lượng việc duyệt lệnh rút tiền thủ",
            "  công cho quản trị viên sau mỗi đơn hàng"
        ],
        lw=2.0
    )

    draw_bw_arrow(ax, 0.35, 0.40, 0.26, 0.33)
    draw_bw_arrow(ax, 0.65, 0.40, 0.74, 0.33)

    p3 = os.path.join(out_dir, "so_do_3_luan_chuyen_vi_6_lop_giap.png")
    plt.tight_layout()
    plt.savefig(p3, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print("Saved Diagram 3:", p3)


def render_diagram_4_sem_bw():
    fig, ax = plt.subplots(figsize=(15.5, 11.8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(
        0.5, 0.97,
        "Sơ đồ 4: Sự ăn khớp giữa khảo sát lý thuyết (722 người), khảo sát thị trường (320 mẫu) và giải pháp CLOOP",
        fontproperties=prop_bold, fontsize=14.5, color="#000000", ha="center", va="top"
    )
    ax.text(
        0.5, 0.94,
        "Giải thích bằng ngôn ngữ kinh tế: Vì sao làm web đẹp mà không giải quyết nỗi sợ mất cọc và phí ship đắt thì khách vẫn không thuê?",
        fontproperties=prop_italic, fontsize=11, color="#000000", ha="center", va="top"
    )

    draw_bw_box(
        ax, 0.02, 0.71, 0.29, 0.19,
        "1. Giao diện dễ dùng & rõ ràng (PC)",
        [
            "- Khảo sát 722 người của cô Lam chỉ ra:",
            "+ Web dễ dùng (0,954), thông tin rõ (0,867)",
            "+ Nhưng tác động thẳng tới hành vi thuê đồ",
            "  lại bằng -0,026 (bị bác bỏ hoàn toàn!)",
            "+ Tức là chỉ làm web đẹp thì khách chưa thuê"
        ]
    )

    draw_bw_box(
        ax, 0.02, 0.48, 0.29, 0.19,
        "2. Lợi ích kinh tế & tiện ích (CFPV)",
        [
            "- Muốn khách thuê, web phải mang lại:",
            "+ Lợi ích kinh tế tiết kiệm tiền (EV = 0,938,",
            "  đây là yếu tố có điểm số cao nhất)",
            "+ Sự tiện lợi nhanh chóng (FCV = 0,926)",
            "+ Từ lợi ích này mới tạo ra Niềm tin (0,859)"
        ]
    )

    draw_bw_box(
        ax, 0.02, 0.25, 0.29, 0.19,
        "3. Niềm tin vào sàn trung gian (PT)",
        [
            "- Đây là chốt chặn quyết định (0,677):",
            "+ Khách chỉ xuống tiền khi tin rằng sàn bảo",
            "  vệ tiền cọc của họ công bằng, minh bạch",
            "+ Chuỗi tác động qua Lợi ích và Niềm tin",
            "  đạt 0,505 (chứng minh bắt buộc phải có)"
        ],
        lw=2.0
    )

    draw_bw_box(
        ax, 0.02, 0.02, 0.29, 0.19,
        "4. Hành vi thuê và cho thuê lại (CFCB)",
        [
            "- Khi đã có Lợi ích kinh tế và Niềm tin:",
            "+ Khách sẵn sàng đặt thuê đồ (0,839)",
            "+ Giữ gìn kéo dài tuổi thọ váy (0,780)",
            "+ Mang tủ đồ cá nhân lên cho thuê lại (0,849)"
        ]
    )

    draw_bw_box(
        ax, 0.355, 0.71, 0.29, 0.19,
        "Thực tế 1: Chờ check lịch & đồ cũ",
        [
            "- Trong 120 bình luận phàn nàn thực tế:",
            "+ Có 23 người (19,17%) bức xúc vì chờ chủ",
            "  tiệm tìm sổ tay mất 4-12h, hủy đơn sát ngày",
            "+ Có 16 người (13,33%) phàn nàn váy nhận về",
            "  bị cũ, ám mùi khác xa ảnh chụp mẫu"
        ]
    )

    draw_bw_box(
        ax, 0.355, 0.48, 0.29, 0.19,
        "Thực tế 2: Phí ship 2 chiều quá đắt",
        [
            "- Có 35 người (29,17%) bỏ cuộc vì tiền ship:",
            "+ Thuê trên Shopee chịu ship 2 chiều 55k-70k",
            "+ Mua đồ cũ thanh lý tốn trung bình 281.867đ",
            "+ Thuê tiệm ở Vinh tốn 200.000đ và 4 lượt đi",
            "  lại ngoài đường nắng mưa"
        ]
    )

    draw_bw_box(
        ax, 0.355, 0.25, 0.29, 0.19,
        "Thực tế 3: Sợ mất cọc & giam cọc",
        [
            "- Nỗi đau số 1 chiếm 38,33% (46/120 người):",
            "+ Bắt cọc 569.456đ (Shopee) đến 869.565đ",
            "  (tiệm Vinh) hoặc giữ thẻ CCCD gắn chip gốc",
            "+ Ngâm tiền cọc 3-7 ngày mới trả (13 mẫu)",
            "+ Bắt lỗi vặt trừ cọc oan 100k-200k (11 mẫu)"
        ],
        lw=2.0
    )

    draw_bw_box(
        ax, 0.355, 0.02, 0.29, 0.19,
        "Thực tế 4: Hiệu quả cho thuê 2 chiều",
        [
            "- Khảo sát 200 sản phẩm thực tế chỉ ra:",
            "+ Bán thanh lý 1 chiều chỉ bán được 1 lần",
            "+ Cho thuê 2 chiều quay vòng 46,48 lần trên",
            "  Shopee và 61,30 lần tại tiệm TP. Vinh",
            "+ Doanh thu 1 chiếc váy nhân lên gấp 45-60 lần"
        ]
    )

    draw_bw_box(
        ax, 0.69, 0.71, 0.29, 0.19,
        "Giải pháp 1: Khóa lịch tự động & ảnh thật",
        [
            "- Khóa lịch ngay lập tức khi khách đặt, tự động",
            "  chừa 1-2 ngày trống để giặt ủi sạch sẽ",
            "- Bắt buộc chụp ảnh thực tế trước và sau khi",
            "  gửi hàng kèm nhật ký số lần đã mặc"
        ]
    )

    draw_bw_box(
        ax, 0.69, 0.48, 0.29, 0.19,
        "Giải pháp 2: Chia đôi phí ship (14.000đ)",
        [
            "- Khách chỉ trả ship chiều đi (14.000đ ở Vinh),",
            "  chiều trả về chủ tủ chịu (trừ từ tiền thuê)",
            "- Tổng tiền khách trả cho 3 ngày thuê + ship",
            "  chỉ còn 139.000đ (rẻ hơn 30% đến 50%)"
        ]
    )

    draw_bw_box(
        ax, 0.69, 0.25, 0.29, 0.19,
        "Giải pháp 3: Két giữ cọc, chia 3 cấp & ví",
        [
            "- Sàn đứng giữa giữ cọc, chia 3 cấp độ hư hỏng",
            "  công bằng (bẩn nhẹ trừ 0đ, sửa được tối đa 50%)",
            "- Cho phép dùng luôn 800k cọc trong ví để đặt",
            "  đơn mới, bọc 6 lớp khóa chống số dư ảo"
        ],
        lw=2.0
    )

    draw_bw_box(
        ax, 0.69, 0.02, 0.29, 0.19,
        "Giải pháp 4: Điểm hòa vốn cực thấp",
        [
            "- Sàn thu 12% phí hoa hồng, tốn 0đ tiền thuê",
            "  mặt bằng kho bãi (chi phí mặt bằng số 3,5 triệu)",
            "- Hòa vốn ở mức 209 đơn/tháng (giá 150.000đ)",
            "  hoặc chỉ 161 đơn/tháng khi tính thêm tiền Lá"
        ]
    )

    draw_bw_arrow(ax, 0.165, 0.71, 0.165, 0.67)
    draw_bw_arrow(ax, 0.165, 0.48, 0.165, 0.44)
    draw_bw_arrow(ax, 0.165, 0.25, 0.165, 0.21)

    for y_mid in [0.805, 0.575, 0.345, 0.115]:
        draw_bw_arrow(ax, 0.31, y_mid, 0.355, y_mid)
        draw_bw_arrow(ax, 0.645, y_mid, 0.69, y_mid)

    p4 = os.path.join(out_dir, "so_do_4_anh_xa_sem_du_lieu_thuc_chung_cloop.png")
    plt.tight_layout()
    plt.savefig(p4, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print("Saved Diagram 4:", p4)


def render_diagram_5_revenue_cost_breakeven_bw():
    fig, ax = plt.subplots(figsize=(15.5, 11.8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(
        0.5, 0.97,
        "Sơ đồ 5: Cấu trúc doanh thu, chi phí mặt bằng số, cách nuôi bộ máy khi vốn đọng 5-9 ngày và Điểm hòa vốn",
        fontproperties=prop_bold, fontsize=14.0, color="#000000", ha="center", va="top"
    )
    ax.text(
        0.5, 0.94,
        "Không thuê mặt bằng gạch đá truyền thống thì phải trả tiền thuê Mặt bằng số (Cloud, dữ liệu, cổng thanh toán) mỗi ngày",
        fontproperties=prop_italic, fontsize=11, color="#000000", ha="center", va="top"
    )

    draw_bw_box(
        ax, 0.03, 0.66, 0.45, 0.24,
        "A. Ba nguồn doanh thu thực tế của sàn CLOOP",
        [
            "- Nguồn 1 (Phí hoa hồng 12% trên giá thuê): Thu 18.000đ/đơn (ở mức",
            "  giá 150k) hoặc 15.000đ/đơn (ở mức giá 125k). Mở khóa sau 5-9 ngày",
            "- Nguồn 2 (Bán gói Lá đẩy Top 20k-100k): Tiền thuê kệ ưu tiên trên",
            "  mặt bằng số. Thu tiền tươi ăn ngay 100% trong ngày, không bị giam!",
            "- Nguồn 3 (Lãi từ vốn lưu đọng Cash Float): Lãi ngân hàng từ cục tiền",
            "  cọc hàng chục triệu đồng luôn nằm thường trực trong tài khoản sàn",
            "  (Lưu ý: Tiền phạt hư hỏng váy đền 100% cho chủ tủ theo 3 cấp độ)"
        ],
        lw=1.8
    )

    draw_bw_box(
        ax, 0.52, 0.66, 0.45, 0.24,
        "B. Chi phí thuê Mặt bằng số (3.500.000đ/tháng = 117.000đ/ngày)",
        [
            "- Định phí trả đều mỗi tháng (thay cho thuê cửa hàng vật lý 8-12 triệu):",
            "+ Thuê máy chủ Cloud & Cơ sở dữ liệu 24/24: 700.000đ (23.300đ/ngày)",
            "+ Kho lưu ảnh/video kiểm chứng 2 đầu & Tên miền: 500.000đ (16.700đ/ngày)",
            "+ Duy trì cổng thanh toán tự động & tin nhắn báo đơn: 800.000đ (26.700đ/ngày)",
            "+ Chi phí kéo khách vào mặt bằng số (Marketing SV): 1.500.000đ (50.000đ/ngày)",
            "- Biến phí theo từng đơn (quỹ dự phòng 5% + băng thông): 1.000đ-1.200đ/đơn"
        ],
        lw=1.8
    )

    draw_bw_box(
        ax, 0.03, 0.36, 0.94, 0.24,
        "C. Trong 5 đến 9 ngày tiền đơn hàng đang bị giam trong két (chưa rút được 12% phí), lấy gì trả 117.000đ/ngày tiền Cloud?",
        [
            "- Cơ chế 1 (Lấy tiền tươi nuôi chi phí ngày): Tiền chủ tủ nạp mua gói Lá đẩy Top (20k-100k) không bị giam trong két cọc mà vào thẳng",
            "  túi sàn ngay lập tức. Mỗi ngày chỉ cần 2-3 chủ tủ mua gói đẩy Top là có ngay 100k-150k tiền tươi trả đứt 117.000đ/ngày tiền mặt bằng số!",
            "- Cơ chế 2 (Chu kỳ trả sau 30 ngày của Cloud): Các hãng Cloud (Vercel, Supabase) thu tiền vào cuối tháng (30 ngày/lần), trong khi vòng quay",
            "  1 đơn thuê chỉ mất 5-9 ngày. Tức là tiền phí 12% của 3 đến 4 vòng đơn hàng đã kịp giải ngân về túi sàn trước ngày phải đóng tiền Cloud!",
            "- Cơ chế 3 (Vốn lưu đọng Cash Float sinh lời): Nhờ tính năng xoay vòng 800k cọc trong ví qua nhiều đơn, tài khoản ngân hàng của sàn luôn có",
            "  số dư thực tế lớn, vừa được miễn phí dịch vụ ngân hàng, vừa gửi 60% phần vốn đáy vào kỳ hạn ngắn 7-14 ngày lấy lãi đỡ chi phí vận hành."
        ],
        lw=2.0
    )

    draw_bw_arrow(ax, 0.255, 0.66, 0.35, 0.60)
    draw_bw_arrow(ax, 0.745, 0.66, 0.65, 0.60)

    draw_bw_box(
        ax, 0.03, 0.03, 0.45, 0.27,
        "D1. Điểm hòa vốn ở mức giá thuê 150.000đ/đơn",
        [
            "- Phí sàn 12% = 18.000đ; trừ dự phòng & biến phí 1.200đ",
            "- Tiền lời ròng sàn bỏ túi: 16.800đ / đơn hàng",
            "- Nếu CHỈ tính riêng tiền phí hoa hồng 12%:",
            "+ Cần tối thiểu: 7 đơn/ngày = 209 đơn/tháng",
            "- Khi CỘNG THÊM tiền bán gói Lá & lãi vốn đọng (800k/tháng):",
            "+ Cần tối thiểu: 5,4 đơn/ngày = 161 đơn/tháng",
            "+ Quy ra số váy: Chỉ cần 47 chiếc váy (quay vòng 3,45 lần/tháng)"
        ],
        lw=1.8
    )

    draw_bw_box(
        ax, 0.52, 0.03, 0.45, 0.27,
        "D2. Điểm hòa vốn ở mức giá thuê 125.000đ/đơn (Gói 139k)",
        [
            "- Phí sàn 12% = 15.000đ; trừ dự phòng & biến phí 1.000đ",
            "- Tiền lời ròng sàn bỏ túi: 14.000đ / đơn hàng",
            "- Nếu CHỈ tính riêng tiền phí hoa hồng 12%:",
            "+ Cần tối thiểu: 8,3 đơn/ngày = 250 đơn/tháng",
            "- Khi CỘNG THÊM tiền bán gói Lá & lãi vốn đọng (800k/tháng):",
            "+ Cần tối thiểu: 6,4 đơn/ngày = 193 đơn/tháng",
            "+ Quy ra số váy: Chỉ cần 56 chiếc váy (quay vòng 3,45 lần/tháng)"
        ],
        lw=1.8
    )

    draw_bw_arrow(ax, 0.35, 0.36, 0.255, 0.30)
    draw_bw_arrow(ax, 0.65, 0.36, 0.745, 0.30)

    p5 = os.path.join(out_dir, "so_do_5_cau_truc_doanh_thu_chi_phi_mat_bang_so_va_hoa_von.png")
    plt.tight_layout()
    plt.savefig(p5, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print("Saved Diagram 5:", p5)


if __name__ == "__main__":
    render_diagram_1_cashflow_bw()
    render_diagram_2_bottlenecks_bw()
    render_diagram_3_wallet_bw()
    render_diagram_4_sem_bw()
    render_diagram_5_revenue_cost_breakeven_bw()
