export interface CoinPackage {
  code: string;
  name: string;
  amountVnd: number;
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  badge?: string;
  popular?: boolean;
}

export const COIN_PACKAGES: Record<string, CoinPackage> = {
  LEAF_10K: {
    code: "LEAF_10K",
    name: "Gói Trải Nghiệm",
    amountVnd: 10000,
    baseCoins: 1000,
    bonusCoins: 0,
    totalCoins: 1000,
  },
  LEAF_20K: {
    code: "LEAF_20K",
    name: "Gói Khởi Động",
    amountVnd: 20000,
    baseCoins: 2000,
    bonusCoins: 100,
    totalCoins: 2100,
    badge: "+5% Lá",
  },
  LEAF_50K: {
    code: "LEAF_50K",
    name: "Gói Phổ Thông",
    amountVnd: 50000,
    baseCoins: 5000,
    bonusCoins: 500,
    totalCoins: 5500,
    badge: "+10% Lá",
    popular: true,
  },
  LEAF_100K: {
    code: "LEAF_100K",
    name: "Gói VIP Đẩy Top",
    amountVnd: 100000,
    baseCoins: 10000,
    bonusCoins: 1500,
    totalCoins: 11500,
    badge: "+15% Lá",
  },
};

export interface QuestDefinition {
  code: string;
  title: string;
  description: string;
  rewardCoins: number;
  icon: string;
  type: "ONE_TIME" | "WEEKLY" | "MILESTONE";
  actionText: string;
  actionUrl?: string;
}

export const QUEST_DEFINITIONS: Record<string, QuestDefinition> = {
  WELCOME_ACTIVATION: {
    code: "WELCOME_ACTIVATION",
    title: "Chào mừng Thành viên mới",
    description: "Kích hoạt tài khoản CLOOP và nhận ngay túi Lá tân thủ.",
    rewardCoins: 100,
    icon: "🎁",
    type: "ONE_TIME",
    actionText: "Tự động nhận",
  },
  FIRST_LISTING: {
    code: "FIRST_LISTING",
    title: "Đăng tải món đồ ĐẦU TIÊN",
    description: "Treo chiếc váy/áo đầu tiên lên tủ đồ để bắt đầu hành trình chia sẻ.",
    rewardCoins: 400,
    icon: "👗",
    type: "ONE_TIME",
    actionText: "Đăng đồ ngay",
    actionUrl: "/my-closet/add-item",
  },
  WEEKLY_LISTING_1: {
    code: "WEEKLY_LISTING_1",
    title: "Chăm chỉ tuần này",
    description: "Đăng tải thêm ít nhất 1 món đồ mới trong tuần để làm phong phú tủ đồ.",
    rewardCoins: 50,
    icon: "🌿",
    type: "WEEKLY",
    actionText: "Đăng thêm đồ",
    actionUrl: "/my-closet/add-item",
  },
  FIVE_STAR_ORDER: {
    code: "FIVE_STAR_ORDER",
    title: "Chủ đồ 5 Sao Uy Tín",
    description: "Hoàn tất đơn cho thuê và nhận được đánh giá 5 sao từ người thuê.",
    rewardCoins: 100,
    icon: "⭐",
    type: "MILESTONE",
    actionText: "Xem đơn hàng",
    actionUrl: "/my-closet/orders",
  },
  REFERRAL_FIRST_ORDER: {
    code: "REFERRAL_FIRST_ORDER",
    title: "Mời Bạn Cùng Chia Sẻ",
    description: "Giới thiệu bạn bè tham gia CLOOP và họ hoàn thành đơn thuê đầu tiên.",
    rewardCoins: 300,
    icon: "🤝",
    type: "MILESTONE",
    actionText: "Chia sẻ link",
    actionUrl: "/my-closet",
  },
};
