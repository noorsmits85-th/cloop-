export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: string
          name: string | null
          avatar: string | null
          rating: number
          isVerified: boolean
          totalListings: number
          completedOrders: number
          createdAt: string
          walletBalance: number
          cloopLeaves: number
        }
        Insert: {
          id?: string
          role?: string
          name?: string | null
          avatar?: string | null
          rating?: number
          isVerified?: boolean
          totalListings?: number
          completedOrders?: number
          createdAt?: string
          walletBalance?: number
          cloopLeaves?: number
        }
        Update: {
          id?: string
          role?: string
          name?: string | null
          avatar?: string | null
          rating?: number
          isVerified?: boolean
          totalListings?: number
          completedOrders?: number
          createdAt?: string
          walletBalance?: number
          cloopLeaves?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          title: string
          description: string | null
          size: string
          bust: number | null
          waist: number | null
          hips: number | null
          gender: string
          condition: string
          category: string
          brand: string | null
          color: string | null
          material: string | null
          style: string | null
          occasion: string | null
          season: string | null
          province: string
          districtId: number | null
          wardCode: string | null
          specificAddress: string
          latitude: number | null
          longitude: number | null
          userId: string | null
          status: string
          isDeleted: boolean
          createdAt: string
          updatedAt: string
          boostExpiresAt: string | null
          isHighlighted: boolean
          embedding: any | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          size: string
          bust?: number | null
          waist?: number | null
          hips?: number | null
          gender?: string
          condition: string
          category: string
          brand?: string | null
          color?: string | null
          material?: string | null
          style?: string | null
          occasion?: string | null
          season?: string | null
          province: string
          districtId?: number | null
          wardCode?: string | null
          specificAddress: string
          latitude?: number | null
          longitude?: number | null
          userId?: string | null
          status?: string
          isDeleted?: boolean
          createdAt?: string
          updatedAt?: string
          boostExpiresAt?: string | null
          isHighlighted?: boolean
          embedding?: any | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          size?: string
          bust?: number | null
          waist?: number | null
          hips?: number | null
          gender?: string
          condition?: string
          category?: string
          brand?: string | null
          color?: string | null
          material?: string | null
          style?: string | null
          occasion?: string | null
          season?: string | null
          province?: string
          districtId?: number | null
          wardCode?: string | null
          specificAddress?: string
          latitude?: number | null
          longitude?: number | null
          userId?: string | null
          status?: string
          isDeleted?: boolean
          createdAt?: string
          updatedAt?: string
          boostExpiresAt?: string | null
          isHighlighted?: boolean
          embedding?: any | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          productId: string
          listingType: string
          status: string
          basePrice: number | null
          snapshot: Json | null
          pricing_tiers: Json | null
          turnaround_days: number
          salePrice: number | null
          deposit: number | null
          minDays: number | null
          greenPoints: number | null
          createdAt: string
          updatedAt: string
          isDeleted: boolean
        }
        Insert: {
          id?: string
          productId: string
          listingType: string
          status?: string
          basePrice?: number | null
          snapshot?: Json | null
          pricing_tiers?: Json | null
          turnaround_days?: number
          salePrice?: number | null
          deposit?: number | null
          minDays?: number | null
          greenPoints?: number | null
          createdAt?: string
          updatedAt?: string
          isDeleted?: boolean
        }
        Update: {
          id?: string
          productId?: string
          listingType?: string
          status?: string
          basePrice?: number | null
          snapshot?: Json | null
          pricing_tiers?: Json | null
          turnaround_days?: number
          salePrice?: number | null
          deposit?: number | null
          minDays?: number | null
          greenPoints?: number | null
          createdAt?: string
          updatedAt?: string
          isDeleted?: boolean
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          productId: string
          url: string
          storageProvider: string
          publicId: string | null
          width: number | null
          height: number | null
          bytes: number | null
          format: string | null
          isPrimary: boolean
          sortOrder: number
          createdAt: string
        }
        Insert: {
          id?: string
          productId: string
          url: string
          storageProvider?: string
          publicId?: string | null
          width?: number | null
          height?: number | null
          bytes?: number | null
          format?: string | null
          isPrimary?: boolean
          sortOrder?: number
          createdAt?: string
        }
        Update: {
          id?: string
          productId?: string
          url?: string
          storageProvider?: string
          publicId?: string | null
          width?: number | null
          height?: number | null
          bytes?: number | null
          format?: string | null
          isPrimary?: boolean
          sortOrder?: number
          createdAt?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          userId: string
          title: string
          content: string | null
          status: string
          views: number
          likes: number
          comments: number
          createdAt: string
          updatedAt: string
          isDeleted: boolean
        }
        Insert: {
          id?: string
          userId: string
          title: string
          content?: string | null
          status?: string
          views?: number
          likes?: number
          comments?: number
          createdAt?: string
          updatedAt?: string
          isDeleted?: boolean
        }
        Update: {
          id?: string
          userId?: string
          title?: string
          content?: string | null
          status?: string
          views?: number
          likes?: number
          comments?: number
          createdAt?: string
          updatedAt?: string
          isDeleted?: boolean
        }
        Relationships: []
      }
      blog_interactions: {
        Row: {
          id: string
          blogId: string
          userId: string
          type: string
          createdAt: string
        }
        Insert: {
          id?: string
          blogId: string
          userId: string
          type: string
          createdAt?: string
        }
        Update: {
          id?: string
          blogId?: string
          userId?: string
          type?: string
          createdAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
