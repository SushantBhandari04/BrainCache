declare module "razorpay" {
    interface RazorpayConstructorOptions {
        key_id: string;
        key_secret: string;
    }

    export interface RazorpayOrder {
        id: string;
        amount: number;
        currency: string;
        receipt?: string;
        status?: string;
        notes?: Record<string, string>;
    }

    export interface RazorpayOrderOptions {
        amount: number;
        currency: string;
        receipt?: string;
        notes?: Record<string, string>;
    }

    export interface RazorpayPayment {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        order_id: string;
        status: "created" | "authorized" | "captured" | "failed" | "refunded";
        method?: string;
        email?: string;
        contact?: string;
        notes?: Record<string, string>;
    }

    export default class Razorpay {
        constructor(options: RazorpayConstructorOptions);
        orders: {
            create(options: RazorpayOrderOptions): Promise<RazorpayOrder>;
            fetch(orderId: string): Promise<RazorpayOrder>;
        };
        payments: {
            fetch(paymentId: string): Promise<RazorpayPayment>;
        };
    }
}

