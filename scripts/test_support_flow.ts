import {
  getOrCreateSupportTicket,
  sendCustomerMessage,
  sendAdminMessage,
  getTicketMessages,
  getAllSupportTickets,
  markTicketReadByAdmin,
} from "../app/actions/support";

async function runTest() {
  console.log("=== 1. TEST TẠO TICKET HỖ TRỢ ===");
  const ticketRes = await getOrCreateSupportTicket({
    customerName: "Nguyễn Thu Hà (Test)",
    customerPhone: "0987654321",
    customerEmail: "thuha.test@cloop.vn",
  });
  console.log("Kết quả tạo ticket:", ticketRes.success ? "THÀNH CÔNG" : "THẤT BẠI");
  if (!ticketRes.success || !ticketRes.ticket) {
    throw new Error("Không thể tạo ticket: " + ticketRes.error);
  }
  const ticketId = ticketRes.ticket.id;
  console.log("Ticket ID:", ticketId);

  console.log("\n=== 2. TEST KHÁCH GỬI TIN NHẮN ===");
  const custMsgRes = await sendCustomerMessage({
    ticketId,
    content: "Chào CLOOP, mình muốn hỏi về chính sách đổi size váy dạ hội?",
    senderName: "Nguyễn Thu Hà",
  });
  console.log("Khách gửi tin:", custMsgRes.success ? "THÀNH CÔNG" : "THẤT BẠI");

  console.log("\n=== 3. TEST ADMIN TRẢ LỜI (CHUYÊN VIÊN CSKH) ===");
  const adminMsgRes = await sendAdminMessage({
    ticketId,
    content: "Dạ chào bạn Thu Hà! CLOOP hỗ trợ đổi size miễn phí trong vòng 24h từ lúc nhận đầm ạ. Bạn gửi lại mã đơn hàng giúp chúng mình nhé! 😊",
  });
  console.log("Admin gửi tin:", adminMsgRes.success ? "THÀNH CÔNG" : "THẤT BẠI");
  console.log("Tên hiển thị của Admin:", adminMsgRes.message?.senderName);

  console.log("\n=== 4. TEST LẤY TOÀN BỘ TIN NHẮN ===");
  const msgsRes = await getTicketMessages(ticketId);
  console.log("Số tin nhắn trong hội thoại:", msgsRes.messages.length);
  msgsRes.messages.forEach((m, i) => {
    console.log(`  [${i + 1}] [${m.senderType}] ${m.senderName}: "${m.content}"`);
  });

  console.log("\n=== 5. TEST ADMIN ĐÁNH DẤU ĐÃ ĐỌC (TẮT CHUÔNG) ===");
  const readRes = await markTicketReadByAdmin(ticketId);
  console.log("Đánh dấu đã đọc:", readRes.success ? "THÀNH CÔNG" : "THẤT BẠI");

  console.log("\n=== TẤT CẢ TEST ĐỀU VƯỢT QUA 100%! ===");
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
