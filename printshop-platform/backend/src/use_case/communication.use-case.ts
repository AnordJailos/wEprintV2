/**
 * Talking to the customer about an order.
 *
 * The studio's real channel is WhatsApp, so the backend builds a wa.me deep link
 * and logs that it did. Nothing is sent from the server for WhatsApp; the owner
 * taps the link. E-mail is logged now and delivered once SMTP exists.
 */
import { assertOwnership, type AuthUser } from "@/core/auth";
import { config } from "@/core/config";
import { ApiError } from "@/core/errors";
import { communicationResponse } from "@/api/dto";
import { CommunicationRepository } from "@/repository/communication.repository";
import { OrderRepository } from "@/repository/order.repository";
import { UserRepository } from "@/repository/user.repository";

const STATUS_TEXT: Record<string, string> = {
  pending: "we have received your order",
  confirmed: "your order is confirmed",
  in_production: "your order is on the press",
  quality_check: "your order is in quality check",
  ready: "your order is ready for pickup",
  delivered: "your order has been delivered",
  cancelled: "your order has been cancelled",
};

export const CommunicationUseCase = {
  async list(user: AuthUser, orderId: number) {
    const order = await OrderRepository.find(orderId);
    if (!order) throw ApiError.notFound("No such order.");
    assertOwnership(user, order.user_id);
    return (await CommunicationRepository.listByOrder(orderId)).map(communicationResponse);
  },

  /**
   * Returns a wa.me link plus the pre-filled message. The phone number used is
   * the customer's when the owner asks, and the studio's when a customer asks —
   * so neither side has to know the other's number by heart.
   */
  async whatsappLink(user: AuthUser, orderId: number) {
    const order = await OrderRepository.find(orderId);
    if (!order) throw ApiError.notFound("No such order.");
    assertOwnership(user, order.user_id);

    const customer = await UserRepository.findById(order.user_id);
    const isOwner = user.role === "admin";
    const target = isOwner ? (customer?.phone ?? "") : config().studioWhatsappNumber;
    if (!target) {
      throw ApiError.badRequest(
        isOwner
          ? "This customer has no phone number on file."
          : "The studio WhatsApp number is not configured.",
      );
    }

    const message = isOwner
      ? `Hello ${customer?.name ?? "there"}, ${STATUS_TEXT[order.status] ?? "there is an update"} — order ${order.reference}. — AK IT'S TIME TO SHINE`
      : `Hello AK, I am asking about order ${order.reference}.`;

    // wa.me wants digits only.
    const digits = target.replace(/\D/g, "");
    const link = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

    const logged = await CommunicationRepository.insert({
      order_id: orderId,
      channel: "whatsapp",
      summary: `WhatsApp link opened for ${order.reference}`,
      payload: message,
      sent_by: user.id,
    });

    return { link, message, communication: communicationResponse(logged) };
  },

  /**
   * TODO (phase 4, SMTP): once mail credentials exist, deliver the message here
   * before writing the log row, and fail the request if delivery fails. The log
   * row deliberately records intent, so history is never lost.
   */
  async sendEmail(admin: AuthUser, orderId: number, input: { message: string; subject?: string }) {
    const order = await OrderRepository.find(orderId);
    if (!order) throw ApiError.notFound("No such order.");

    const customer = await UserRepository.findById(order.user_id);
    const subject = input.subject ?? `Update on order ${order.reference}`;

    const logged = await CommunicationRepository.insert({
      order_id: orderId,
      channel: "email",
      summary: `${subject} → ${customer?.email ?? "unknown"}`,
      payload: input.message,
      sent_by: admin.id,
    });
    return communicationResponse(logged);
  },
};
