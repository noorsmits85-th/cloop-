import { z } from "zod";

export const createOutfitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Tên trang phục phải có ít nhất 3 ký tự")
    .max(100, "Tên trang phục quá dài"),

  description: z
    .string()
    .trim()
    .min(10, "Mô tả phải từ 10 ký tự trở lên để người thuê dễ hình dung")
    .max(2000, "Mô tả không được vượt quá 2000 ký tự"),

  category: z.enum([
    "TOPS",
    "BOTTOMS",
    "OUTERWEAR",
    "DRESSES",
    "SHOES",
    "ACCESSORIES",
  ]),

  pricePerDay: z
    .number()
    .positive("Giá thuê mỗi ngày phải lớn hơn 0")
    .max(100000000, "Giá thuê không được vượt quá 100 triệu"),

  depositFee: z
    .number()
    .min(0, "Tiền cọc không được là số âm")
    .max(100000000, "Tiền cọc không được vượt quá 100 triệu"),

  latitude: z
    .number()
    .min(-90, "Vĩ độ phải nằm trong khoảng từ -90 đến 90")
    .max(90, "Vĩ độ phải nằm trong khoảng từ -90 đến 90"),

  longitude: z
    .number()
    .min(-180, "Kinh độ phải nằm trong khoảng từ -180 đến 180")
    .max(180, "Kinh độ phải nằm trong khoảng từ -180 đến 180"),

  material: z
    .string()
    .trim()
    .min(2, "Chất liệu vải phải từ 2 ký tự trở lên")
    .max(50, "Chất liệu quá dài"),

  images: z
    .array(z.string().url("Đường dẫn ảnh phải là URL hợp lệ"))
    .min(1, "Phải có ít nhất 1 hình ảnh")
    .max(3, "Chỉ được đăng tối đa 3 hình ảnh"),
});

export type CreateOutfitInput = z.infer<typeof createOutfitSchema>;