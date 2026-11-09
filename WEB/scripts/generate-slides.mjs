import fs from 'node:fs';
import pptxgen from 'pptxgenjs';
import { chromium } from '@playwright/test';

const results = JSON.parse(fs.readFileSync('review-results/playwright-after.json', 'utf8'));
if (results.stats.unexpected || results.stats.flaky)
  throw new Error('Resolve failing/flaky tests before generating final slides.');
const passed = results.stats.expected;
const slides = [
  {
    title: 'WEBSITE NIKE STORE',
    kicker: 'BÀI TẬP NHÓM · LẬP TRÌNH WEB',
    bullets: [
      'Website bán hàng cơ bản',
      'Backend PHP + MySQL · Frontend React / Next.js',
      'Nhóm / Lớp / Giảng viên: cần nhóm bổ sung',
    ],
    notes:
      'Giới thiệu tên đề tài đã xác nhận. Điền thông tin lớp, nhóm và giảng viên trước khi nộp.',
  },
  {
    title: 'Bài toán & mục tiêu',
    bullets: [
      'Khách hàng tìm sản phẩm, chọn size/màu và đặt hàng.',
      'Cửa hàng quản lý nội dung, ảnh, tồn kho và đơn hàng.',
      'Phân quyền rõ ràng giữa khách, khách hàng và Admin.',
      'Dữ liệu lưu bền vững trong MySQL.',
    ],
    notes: 'Nêu bối cảnh website bán hàng cơ bản; chỉ ra hai nhóm màn hình và dữ liệu cần quản lý.',
  },
  {
    title: 'Đáp ứng yêu cầu đề bài',
    bullets: [
      'PHP + MySQL cho toàn bộ nghiệp vụ backend.',
      'Trang người dùng và Admin; giao diện responsive.',
      'CRUD sản phẩm đầy đủ; phân quyền tại server.',
      'Phân trang, upload nhiều ảnh và editor mô tả.',
    ],
    notes:
      'Đối chiếu trực tiếp các gạch đầu dòng trong PDF. Next.js chỉ là frontend và proxy, không thay thế PHP backend.',
  },
  {
    title: 'Kiến trúc hệ thống',
    diagram: 'architecture',
    bullets: [],
    notes:
      'Trình duyệt dùng một origin; Next.js chuyển yêu cầu API sang PHP. PHP xác thực, kiểm tra nghiệp vụ và dùng PDO truy cập MySQL. Ảnh và thư local nằm ngoài public.',
  },
  {
    title: 'Thiết kế cơ sở dữ liệu',
    diagram: 'database',
    bullets: [],
    notes:
      'Giải thích quan hệ users–orders–order_items và products–product_images. Item lưu snapshot tên/giá/ảnh để xóa sản phẩm vẫn giữ lịch sử đơn. sessions lưu hash token, password_resets lưu hash mã có hạn dùng.',
  },
  {
    title: 'Trải nghiệm khách hàng',
    image: 'review-results/after/desktop-products.png',
    bullets: [
      'Tìm kiếm · lọc · sắp xếp',
      'Phân trang · chọn size/màu',
      'Giỏ hàng lưu trên trình duyệt',
      'COD / QR demo · lịch sử · hủy đúng điều kiện',
    ],
    notes: 'Demo một lần từ danh sách tới đơn hàng; không nhập dữ liệu cá nhân thật.',
  },
  {
    title: 'Quản trị nội dung',
    bullets: [
      'Thêm và sửa tên, giá, mô tả, danh mục, size/màu, tồn kho.',
      'Editor định dạng; upload nhiều ảnh JPG / PNG / WebP.',
      'Ẩn, hiện, xóa riêng lẻ hoặc hàng loạt.',
      'Giữ lịch sử đơn khi xóa sản phẩm; chống ghi đè form cũ.',
    ],
    notes:
      'Tạo một sản phẩm mới với hai ảnh, sửa giá, rồi xóa. Giải thích version và dữ liệu snapshot.',
  },
  {
    title: 'Luồng đơn hàng & tồn kho',
    bullets: [
      'Pending → Processing → Shipped → Delivered.',
      'Hủy đơn chưa trả tiền theo đúng trạng thái và quyền.',
      'Khóa sản phẩm trong transaction, tính giá và trừ tồn tại server.',
      'QR demo không chuyển tiền; Admin xem trước/gửi email cho khách.',
    ],
    notes:
      'Khách không được tự đánh dấu Paid. Hủy hợp lệ hoàn tồn đúng một lần, không tự hiện sản phẩm đã bị Admin ẩn.',
  },
  {
    title: 'Xác thực & bảo vệ dữ liệu',
    bullets: [
      'Mật khẩu băm; token phiên ngẫu nhiên, cookie HttpOnly/SameSite.',
      'CSRF + kiểm tra Origin + phân quyền ở PHP.',
      'OTP ngẫu nhiên: hạn 10 phút, một lần dùng, tối đa 5 lần sai.',
      'Validate đầu vào, prepared statements, sanitize HTML, kiểm tra file ảnh.',
    ],
    notes:
      'Trình bày cách khắc phục các lỗi cookie giả, xem đơn qua userId URL và tổng tiền do client gửi.',
  },
  {
    title: 'Kiểm thử & kết quả',
    bullets: [
      `${passed}/${passed} ca tự động đạt; không có ca lỗi hoặc flaky.`,
      'API: CRUD, phân quyền, QR, email, SMTP thử nghiệm và OTP.',
      'Giao dịch: sửa giá, vượt tồn, hủy, trạng thái, mua đồng thời.',
      'Browser: mua hàng, Admin, logout, responsive 390 / 768 / 1440px.',
    ],
    notes:
      'Dẫn tới review-results/playwright-after.json và báo cáo HTML. Tỷ lệ test đạt không đồng nghĩa không còn mọi rủi ro hoặc được chấm điểm tuyệt đối.',
  },
  {
    title: 'Giao diện trên điện thoại',
    image: 'review-results/after/mobile-products.png',
    bullets: [
      'Menu và bộ lọc mobile',
      'Danh sách theo chiều rộng màn hình',
      'Form và trang Admin dùng được ở 390px',
      'Giữ chức năng trên desktop và tablet',
    ],
    notes: 'Mở DevTools hoặc dùng ảnh minh chứng, thao tác bộ lọc mobile và form thêm sản phẩm.',
  },
  {
    title: 'Phân công & đóng góp nhóm',
    bullets: [
      'Thành viên / MSSV: cần nhóm bổ sung.',
      'Phần việc và minh chứng thực tế: cần nhóm xác nhận.',
      'Mức đóng góp: không tự suy đoán hoặc gán tỷ lệ.',
      'Mẫu bảng đầy đủ: docs/TEAM.md.',
    ],
    notes:
      'Slide này cần điền trước khi nộp. Chỉ ghi đóng góp thực tế của mỗi người và giải thích được phần code mình phụ trách.',
  },
  {
    title: 'Demo & giới hạn phạm vi',
    bullets: [
      'Demo local: sản phẩm → giỏ → QR demo → Admin → xem trước email.',
      'Gmail thật cần mật khẩu ứng dụng; Admin có cấu hình và gửi thử.',
      'Không giả lập cổng VNPay / MoMo hoặc giao vận thật.',
      'Link deploy là tùy chọn; Docker được cung cấp, chưa kiểm thử daemon.',
    ],
    notes:
      'Phân biệt tính năng học tập đã chạy với dịch vụ ngoài chưa cấu hình. Nêu định hướng: gateway thật, vận chuyển và hoàn tiền.',
  },
  {
    title: 'Bàn giao & thảo luận',
    bullets: [
      'Source + schema SQL + README cài/chạy.',
      'Thiết kế hệ thống, ERD, API và kịch bản demo.',
      'PPTX / PDF và kết quả kiểm thử có thể kiểm tra lại.',
      'Hoàn tất thông tin nhóm trước khi nộp.',
    ],
    notes:
      'Mời câu hỏi. Chuẩn bị giải thích backend PHP, transaction, session và các ràng buộc dữ liệu.',
  },
];

const deck = new pptxgen();
deck.layout = 'LAYOUT_WIDE';
deck.author = 'Website Nike Store';
deck.subject = 'Bài tập nhóm Lập trình Web';
deck.title = 'Website Nike Store';
deck.company = 'Dự án học tập';
deck.lang = 'vi-VN';
deck.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial', lang: 'vi-VN' };
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const htmlSlides = [];
function containPng(filename, x, y, w, h) {
  const bytes = fs.readFileSync(filename);
  const iw = bytes.readUInt32BE(16),
    ih = bytes.readUInt32BE(20);
  const scale = Math.min(w / iw, h / ih);
  return { x: x + (w - iw * scale) / 2, y: y + (h - ih * scale) / 2, w: iw * scale, h: ih * scale };
}
function box(slide, text, x, y, w, h, dark = false) {
  slide.addShape(deck.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: dark ? '101014' : 'F4F4F5' },
    line: { color: dark ? '101014' : 'E4E4E7' },
  });
  slide.addText(text, {
    x: x + 0.12,
    y: y + 0.1,
    w: w - 0.24,
    h: h - 0.2,
    fontFace: 'Arial',
    fontSize: 20,
    bold: true,
    color: dark ? 'FFFFFF' : '151519',
    align: 'center',
    valign: 'mid',
    breakLine: false,
    margin: 0.06,
  });
}
for (const [index, data] of slides.entries()) {
  const slide = deck.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addShape(deck.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.12,
    fill: { color: 'FF1E27' },
    line: { color: 'FF1E27' },
  });
  slide.addText(data.kicker || 'WEBSITE NIKE STORE / LẬP TRÌNH WEB', {
    x: 0.65,
    y: 0.5,
    w: 12,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: 'FF1E27',
    charSpacing: 1.5,
    margin: 0,
  });
  slide.addText(data.title, {
    x: 0.65,
    y: 1.0,
    w: 12,
    h: 0.8,
    fontSize: 33,
    bold: true,
    color: '101014',
    margin: 0,
  });
  slide.addText(`${String(index + 1).padStart(2, '0')} / ${slides.length}`, {
    x: 11.65,
    y: 6.98,
    w: 1.0,
    h: 0.22,
    fontSize: 10,
    color: '71717A',
    align: 'right',
    margin: 0,
  });
  slide.addNotes(data.notes);
  let bodyHtml = '';
  if (data.diagram === 'architecture') {
    const names = [
      'TRÌNH DUYỆT',
      'NEXT.JS\nGiao diện + proxy',
      'PHP API\nNghiệp vụ',
      'MYSQL\nDữ liệu',
    ];
    names.forEach((name, n) => {
      box(slide, name, 0.65 + n * 3.15, 2.75, 2.6, 1.35, n === 2);
      if (n < 3)
        slide.addText('→', {
          x: 3.25 + n * 3.15,
          y: 3.05,
          w: 0.5,
          h: 0.5,
          fontSize: 30,
          color: 'FF1E27',
          margin: 0,
        });
    });
    slide.addText('PHP → ảnh ngoài public · SMTP / outbox local', {
      x: 1,
      y: 4.8,
      w: 11.3,
      h: 0.5,
      fontSize: 22,
      color: '52525B',
      align: 'center',
    });
    bodyHtml = `<div class="architecture">${names.map((n) => `<div>${escapeHtml(n).replaceAll('\n', '<br>')}</div>`).join('<span>→</span>')}</div><p class="sub">PHP → ảnh ngoài public · SMTP / outbox local</p>`;
  } else if (data.diagram === 'database') {
    const cards = [
      ['USERS', 'id · email · password_hash · role'],
      ['ORDERS', 'user_id · total · status · payment'],
      ['ORDER_ITEMS', 'order_id · product_id · snapshot'],
      ['SESSIONS', 'token_hash · user_id · csrf · expiry'],
      ['PRODUCTS', 'id · giá · biến thể · tồn · version'],
      ['PRODUCT_IMAGES', 'product_id · url · position'],
    ];
    cards.forEach(([name, fields], n) => {
      const x = 0.65 + (n % 3) * 4.1,
        y = 2.2 + Math.floor(n / 3) * 1.8;
      box(slide, `${name}\n${fields}`, x, y, 3.7, 1.3, n === 1);
    });
    slide.addText('users 1—n orders 1—n order_items n—0..1 products 1—n images', {
      x: 0.65,
      y: 6.1,
      w: 12.0,
      h: 0.4,
      fontSize: 18,
      color: '52525B',
      margin: 0,
    });
    bodyHtml = `<div class="dbgrid">${cards.map(([name, fields]) => `<div><strong>${name}</strong><small>${fields}</small></div>`).join('')}</div><p class="sub">users 1—n orders 1—n order_items n—0..1 products 1—n images</p>`;
  } else if (data.image) {
    const mobile = data.image.includes('mobile');
    slide.addImage({
      path: data.image,
      ...containPng(data.image, mobile ? 0.8 : 0.65, 2.0, mobile ? 3.0 : 7.2, 4.6),
    });
    const x = mobile ? 4.4 : 8.2,
      w = mobile ? 8 : 4.45;
    data.bullets.forEach((text, n) =>
      slide.addText(text, {
        x,
        y: 2.25 + n * 0.95,
        w,
        h: 0.8,
        fontSize: 21,
        color: '27272A',
        margin: 0.04,
      }),
    );
    const image = `data:image/png;base64,${fs.readFileSync(data.image).toString('base64')}`;
    bodyHtml = `<div class="withimage ${mobile ? 'mobile' : ''}"><img src="${image}" alt="Giao diện Nike Store"><ul>${data.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul></div>`;
  } else {
    data.bullets.forEach((text, n) => {
      slide.addShape(deck.ShapeType.rect, {
        x: 0.7,
        y: 2.18 + n * 1.02,
        w: 0.08,
        h: 0.5,
        fill: { color: 'FF1E27' },
        line: { color: 'FF1E27' },
      });
      slide.addText(text, {
        x: 1.0,
        y: 2.12 + n * 1.02,
        w: 11.4,
        h: 0.83,
        fontSize: 23,
        color: '27272A',
        margin: 0.03,
        breakLine: false,
      });
    });
    bodyHtml = `<ul class="bullets">${data.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
  }
  htmlSlides.push(
    `<section class="slide"><p class="kicker">${escapeHtml(data.kicker || 'WEBSITE NIKE STORE / LẬP TRÌNH WEB')}</p><h1>${escapeHtml(data.title)}</h1>${bodyHtml}<footer>${index + 1} / ${slides.length}</footer></section>`,
  );
}
fs.mkdirSync('docs', { recursive: true });
await deck.writeFile({ fileName: 'docs/Nike-Store-Slides.pptx', compression: true });
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Website Nike Store</title><style>@page{size:1280px 720px;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#101014}.slide{width:1280px;height:720px;padding:48px 64px;position:relative;page-break-after:always;border-top:12px solid #ff1e27;overflow:hidden}.slide:last-child{page-break-after:auto}.kicker{color:#ff1e27;letter-spacing:2px;font-weight:bold;font-size:13px;margin:0 0 30px}h1{font-size:42px;margin:0 0 45px;line-height:1.2}.bullets{list-style:none;margin:0;padding:0}.bullets li{border-left:7px solid #ff1e27;padding:7px 0 7px 24px;font-size:27px;line-height:1.4;margin-bottom:30px}footer{position:absolute;bottom:30px;right:64px;color:#71717a;font-size:12px}.architecture{display:flex;align-items:center;gap:20px;margin-top:110px}.architecture div{background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;width:230px;height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:23px;text-align:center;font-weight:bold}.architecture span{color:#ff1e27;font-size:35px}.sub{text-align:center;margin-top:45px;color:#52525b;font-size:21px}.dbgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.dbgrid div{border:1px solid #e4e4e7;background:#f4f4f5;padding:28px 18px;border-radius:10px;text-align:center;font-size:22px}.dbgrid small{display:block;font-size:17px;margin-top:15px;line-height:1.4}.withimage{display:flex;align-items:center;gap:30px;height:450px}.withimage img{width:690px;height:450px;object-fit:contain}.withimage ul{font-size:25px;line-height:1.5;flex:1;padding-left:25px}.withimage li{margin-bottom:25px}.withimage.mobile img{width:310px}.withimage.mobile ul{font-size:29px}@media screen{body{background:#ddd}.slide{background:white;margin:15px auto}}</style>${htmlSlides.join('')}</html>`;
fs.writeFileSync('docs/Nike-Store-Slides.html', html);
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : undefined);
const browser = await chromium.launch({ executablePath });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(html);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: 'docs/Nike-Store-Slides.pdf',
    printBackground: true,
    preferCSSPageSize: true,
  });
  const stats = await page
    .locator('.slide')
    .evaluateAll((elements) =>
      elements.map((e) => ({
        width: e.scrollWidth,
        height: e.scrollHeight,
        clientWidth: e.clientWidth,
        clientHeight: e.clientHeight,
      })),
    );
  if (stats.some((s) => s.width > s.clientWidth || s.height > s.clientHeight))
    throw new Error('Slide content overflow.');
  await page.locator('.slide').first().screenshot({ path: 'review-results/after/slide-cover.png' });
} finally {
  await browser.close();
}
console.log(`Generated ${slides.length} slides (PPTX, PDF, HTML) from ${passed} passing tests.`);
