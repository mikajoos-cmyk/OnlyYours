import { supabase } from '../lib/supabase';

export interface Product {
    id: string;
    creatorId: string;
    title: string;
    description: string;
    imageUrl: string;
    price: number;
    shippingCost: number;
    shippingIncluded: boolean;
    isActive: boolean;
}

export class ShopService {

    // Produkte eines Creators laden
    async getProductsByCreator(creatorId: string): Promise<Product[]> {
        const { data, error } = await (supabase
            .from('products' as any)
            .select('*')
            .eq('creator_id', creatorId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }) as any);

        if (error) throw error;

        return (data || []).map((p: any) => ({
            id: p.id,
            creatorId: p.creator_id,
            title: p.title,
            description: p.description,
            imageUrl: p.image_url,
            price: p.price,
            shippingCost: p.shipping_cost || 0,
            shippingIncluded: p.shipping_included || false,
            isActive: p.is_active
        }));
    }

    // Eigene Produkte laden (inkl. inaktive)
    async getMyProducts(): Promise<Product[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await (supabase
            .from('products' as any)
            .select('*')
            .eq('creator_id', user.id)
            .order('created_at', { ascending: false }) as any);

        if (error) throw error;

        return (data || []).map((p: any) => ({
            id: p.id,
            creatorId: p.creator_id,
            title: p.title,
            description: p.description,
            imageUrl: p.image_url,
            price: p.price,
            shippingCost: p.shipping_cost || 0,
            shippingIncluded: p.shipping_included || false,
            isActive: p.is_active
        }));
    }

    // Produkt erstellen
    async createProduct(product: { title: string, description: string, price: number, shippingCost: number, shippingIncluded: boolean, imageUrl: string }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from('products' as any).insert({
            creator_id: user.id,
            title: product.title,
            description: product.description,
            price: product.price,
            shipping_cost: (product as any).shippingCost,
            shipping_included: (product as any).shippingIncluded,
            image_url: product.imageUrl
        } as any);

        if (error) throw error;
    }

    // Produkt aktualisieren
    async updateProduct(productId: string, product: { title: string, description: string, price: number, shippingCost: number, shippingIncluded: boolean, imageUrl?: string, isActive?: boolean }) {
        const { error } = await supabase.from('products' as any).update({
            title: product.title,
            description: product.description,
            price: product.price,
            shipping_cost: (product as any).shippingCost,
            shipping_included: (product as any).shippingIncluded,
            image_url: product.imageUrl,
            is_active: product.isActive
        } as any).eq('id', productId);

        if (error) throw error;
    }

    // Produkt löschen
    async deleteProduct(productId: string) {
        const { error } = await supabase.from('products' as any).delete().eq('id', productId);
        if (error) throw error;
    }


}

export const shopService = new ShopService();
