import { z } from "zod";

export const uploadProductSchema = z.object({
  title: z.string().min(5, { message: "Tên sản phẩm phải có ít nhất 5 ký tự." }).max(100),
  description: z.string().min(10, { message: "Mô tả phải có ít nhất 10 ký tự." }),
  size: z.string().min(1, { message: "Vui lòng chọn size." }),
  material: z.string().min(1, { message: "Vui lòng nhập chất liệu." }),
  color: z.string().optional(),
  condition: z.enum(["95", "99", "NEW"]),
  province: z.string().min(1, { message: "Vui lòng chọn khu vực bàn giao." }),
  ward: z.string().min(1, { message: "Vui lòng nhập phường/xã." }),
  occasion: z.string().optional(),
  
  // Tùy chọn cho thuê
  isRental: z.boolean().default(true),
  rentalPrice: z.number().int().nonnegative().optional(),
  minDays: z.number().int().min(1).default(3),
  
  // Tùy chọn bán đứt
  isSale: z.boolean().default(false),
  salePrice: z.number().int().nonnegative().optional(), // Giá Sở Hữu
  
  // Tiền cọc (luôn bắt buộc nếu có cho thuê)
  deposit: z.number().int().nonnegative().optional(),
  
  // URL Ảnh từ Cloudinary
  images: z.array(z.string().url()).min(1, { message: "Vui lòng tải lên ít nhất 1 ảnh sản phẩm." })
})
.refine(
  (data) => data.isRental || data.isSale,
  {
    message: "Bạn phải chọn ít nhất một hình thức: Cho thuê hoặc Bán đứt.",
    path: ["isRental"]
  }
)
.refine(
  (data) => {
    if (data.isRental && (data.rentalPrice === undefined || data.rentalPrice <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Vui lòng nhập Giá thuê lớn hơn 0.",
    path: ["rentalPrice"]
  }
)
.refine(
  (data) => {
    if (data.isSale && (data.salePrice === undefined || data.salePrice <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Vui lòng nhập Giá Sở Hữu lớn hơn 0.",
    path: ["salePrice"]
  }
)
.refine(
  (data) => {
    if (data.isRental && (data.deposit === undefined || data.deposit <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Vui lòng nhập Tiền cọc lớn hơn 0 (Dùng để bảo vệ tài sản của bạn).",
    path: ["deposit"]
  }
)
.refine(
  (data) => {
    // Tiền cọc phải >= Giá Sở Hữu (nếu có bán đứt)
    if (data.isRental && data.isSale && data.deposit !== undefined && data.salePrice !== undefined) {
      return data.deposit >= data.salePrice;
    }
    return true;
  },
  {
    message: "Cảnh báo rủi ro: Tiền cọc KHÔNG ĐƯỢC nhỏ hơn Giá Sở Hữu!",
    path: ["deposit"]
  }
)
.refine(
  (data) => {
    // Giá thuê phải >= 10% Giá Sở Hữu (nếu có bán đứt)
    if (data.isRental && data.isSale && data.rentalPrice !== undefined && data.salePrice !== undefined) {
      return data.rentalPrice >= data.salePrice * 0.1;
    }
    return true;
  },
  {
    message: "Lỗi nhập liệu: Giá thuê 3 ngày quá rẻ (phải >= 10% Giá Sở Hữu). Bạn có gõ thiếu số 0 không?",
    path: ["rentalPrice"]
  }
);

export type UploadProductInput = z.infer<typeof uploadProductSchema>;
