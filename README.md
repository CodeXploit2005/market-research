# GiáSát 2

Công cụ nghiên cứu thị trường tiếng Việt cho dịch vụ số. Giao diện responsive PC/mobile, sáng/tối, animation có hỗ trợ reduced-motion. Mã nguồn tìm kiếm được tận dụng và sửa từ `openai_websearch` theo MIT; giấy phép gốc tại `server/vendor/LICENSE`. Bản clone gốc và bản trích xuất không bị sửa.

## Khởi động

Yêu cầu Node.js 20.3+ (đã kiểm thử với Node 24 trên máy hiện tại). Không cần npm install cho ứng dụng này.

**Trên Windows:** mở `Start-GiaSat.cmd`. Chương trình bật chế độ LAN và mở trình duyệt. Giữ cửa sổ máy chủ mở khi sử dụng.

Hoặc:

```powershell
node server/index.mjs
```

Mở `http://localhost:4318`. Mặc định chỉ lắng nghe loopback. Trên PC cùng origin, giao diện tự tạo phiên kết nối cục bộ; phiên upstream vẫn nằm phía máy chủ.

## Dùng trên điện thoại

```powershell
node server/index.mjs --lan
```

Máy chủ in địa chỉ `http://<IP-PC>:4318` và mã ghép nối. Điện thoại cùng Wi-Fi mở **địa chỉ đó**, bấm Kết nối, giữ địa chỉ máy chủ và nhập mã. Có thể xem lại địa chỉ/mã trong hộp kết nối trên PC đã ghép nối. Nếu Windows Firewall hỏi, chỉ cho phép mạng riêng mà bạn tin cậy. Không tự mở port ra Internet.

Bản Site HTTPS là giao diện đã xuất bản, không chứa phiên đăng nhập. Nó có thể kết nối máy chủ từ hộp Kết nối bằng địa chỉ/mã, tùy chính sách Local Network Access của trình duyệt. Nếu trình duyệt chặn HTTP nội bộ, dùng giao diện do máy chủ LAN phục vụ. Không tắt bảo mật trình duyệt để khắc phục.

## Kết nối dịch vụ tìm kiếm

Giữ cách gọi dịch vụ của repo clone: tìm phiên trong `OPENAI_WEBSEARCH_AUTH_FILE` hoặc file riêng của thư viện, rồi fallback phiên Codex cục bộ. Máy chủ chỉ trả trạng thái đã sẵn sàng, không trả token upstream.

Nếu chưa có phiên:

```powershell
node server/login.mjs
# hoặc
node server/login.mjs --device-code
```

Đăng nhập theo URL hiển thị. Auth được lưu ngoài thư mục dự án, theo cơ chế của repo gốc. Phiên Codex gốc không bị ghi đè. Không chép thông tin đăng nhập vào frontend, file JSON báo cáo hay Git.

Cũng hỗ trợ OpenAI API chính thức qua biến môi trường `OPENAI_API_KEY`; cần tài khoản API và chi phí sử dụng riêng. Model mặc định cho API là `gpt-5-mini`; model của đường repo giữ `gpt-5.6-luna`. Đổi bằng `OPENAI_WEBSEARCH_MODEL` nếu tài khoản không hỗ trợ. Chỉ chọn model có quyền truy cập và hỗ trợ web_search; không có cơ chế tự đổi model khi lỗi.

Đường đăng nhập/backend của repo phụ thuộc khả năng tài khoản và dịch vụ tại thời điểm sử dụng. Lần kiểm tra trực tiếp trên máy này đã hoàn thành nghiên cứu Canva Pro với ba góc độ và trả nguồn. Điều đó không bảo đảm mọi tài khoản/model đều dùng được.

Tài liệu đối chiếu: [Web search API](https://developers.openai.com/api/docs/guides/tools-web-search), [Authentication](https://learn.chatgpt.com/docs/auth).

## Cách dùng

1. Nhập tên sản phẩm, chọn thời hạn và loại tài khoản, chọn sâu/nhanh.
2. Bấm Nghiên cứu. Ba lượt tìm kiếm chạy độc lập và hiện trạng thái thực tế. Có thể hủy hoặc tiếp tục nhận kết quả khi gián đoạn kết nối.
3. Mở bảng Đối thủ, kiểm tra URL, trích đoạn giá, gói và bảo hành. Giá do AI trích xuất chưa phải xác minh độc lập. Loại bản ghi không phù hợp bằng lý do cụ thể; dữ liệu vẫn giữ để đối chiếu.
4. Xem trung vị trên các bản ghi cùng thời hạn/hình thức, tách chính hãng khỏi reseller. Giá USD chỉ quy đổi khi có tỷ giá ngân hàng có nguồn, trong 7 ngày và không nằm ở tương lai. Không có tỷ giá thì giữ giá gốc và không đưa vào thống kê.
5. Báo cáo lưu tự động trong trình duyệt (tối đa 80). Theo dõi sản phẩm giúp khảo sát lại nhanh, **không phải lịch chạy nền**.
6. So sánh lịch sử chỉ khi cùng sản phẩm, thời hạn, tài khoản, người bán, tên gói và URL. Không có dữ liệu tương đương thì không kết luận xu hướng.
7. Xuất Markdown sáu mục (tối đa 500 từ, rút gọn bảng dài), JSON đầy đủ hoặc sao chép. Sao lưu/nhập JSON để chuyển dữ liệu giữa thiết bị hoặc giữa Site và localhost.
8. Tìm tư liệu để lấy URL ảnh và trang nguồn. Không proxy/tải ảnh từ server; ảnh chặn hotlink có liên kết mở riêng. Kiểm tra quyền sử dụng trước khi đăng bán.

Giá bán tính từ giá vốn sử dụng `giá vốn / (1 - tỷ suất lợi nhuận trên giá bán)`, chưa gồm phí/thuế. Đây là phép tính theo đầu vào của người dùng, không phải dữ liệu giá thị trường.

## MCP dùng với ứng dụng AI

```json
{
  "mcpServers": {
    "giasat": {
      "command": "node",
      "args": ["C:/Users/DungTran/Desktop/GPT/giasat/server/mcp.mjs"]
    }
  }
}
```

Ba công cụ: `web_search`, `image_search`, `research_market`. Giao thức stdio; hỗ trợ initialize, tools/list, tools/call, ping, notification hủy request. Adapter trả dữ liệu JSON trong text, giữ nguồn và truy vấn. Chưa thay đổi cấu hình của ứng dụng AI nào trên máy.

## API cục bộ

| Endpoint | Chức năng |
| --- | --- |
| `GET /api/health` | Health; sau ghép nối có trạng thái dịch vụ/model |
| `POST /api/connect` | Ghép nối, trả token phiên GiáSát; không phải token upstream |
| `GET /api/pairing` | Mã và địa chỉ LAN, cần phiên |
| `POST /api/research` | Tạo job, nhận `{product, period, account, depth}` |
| `GET /api/jobs/:id` | Tiến trình/kết quả; chỉ phiên tạo job được đọc |
| `DELETE /api/jobs/:id` | Hủy job |
| `POST /api/images` | Tìm URL ảnh tham khảo |

Job giữ trong RAM 1 giờ. Khởi động lại máy chủ xóa job và phiên ghép nối; báo cáo đã lưu trong trình duyệt vẫn còn. Mã ghép nối đổi khi khởi động lại. Máy chủ LAN dùng HTTP, thích hợp mạng riêng tin cậy; triển khai Internet cần HTTPS, xác thực người dùng và hạ tầng backend riêng.

## Kiểm thử

```powershell
node --test tests/*.test.mjs
```

Kiểm tra dữ liệu có nguồn, tỷ giá, tách gói, trung vị, lịch sử, giới hạn xuất báo cáo, lỗi/timeout SSE, OAuth state, HTTP pairing/origin và MCP. Dữ liệu test là fixture riêng, không đi vào ứng dụng.

## Các sửa đổi so với lõi repo

- Giữ citations/sources thay vì chỉ văn bản. Tự loại URL trích giá không có trong sources/annotations công cụ trả về.
- Timeout bao phủ toàn bộ stream; báo lỗi nếu luồng lỗi/incomplete/ngắt sớm.
- Parser đọc được SSE cuối không có newline. Dọn UTM bằng URLSearchParams.
- Kiểm tra OAuth state và timeout yêu cầu auth; đồng bộ refresh để tránh ba lượt tìm kiếm refresh cùng lúc.
- Xác định account ID từ claim account trước fallback user claim.
- Giao diện không được nhận token ChatGPT/Codex. Token ghép nối nội bộ chỉ giữ trong sessionStorage và cookie HttpOnly phía máy chủ.

Độ tin cậy báo cáo tối đa tự đánh giá là Trung bình: công cụ tìm được nguồn vẫn chưa chứng minh từng trích xuất chính xác hoặc giá còn hiệu lực. Nguồn không có ngày được gắn nhãn; không thay ngày crawl thành ngày đăng. Nguồn trên 6 tháng cần ghi nhận rõ; ngày tương lai bị loại.

## Triển khai Render

Bản này tự nhận môi trường Render: bind `0.0.0.0:$PORT`, chấp nhận hostname/origin HTTPS của service và yêu cầu mã ghép nối kể cả khi request đi qua proxy cục bộ.

- Runtime: Node. Branch: main. Root Directory: để trống.
- Build Command: `npm install --omit=dev`.
- Start Command: `npm start`.
- Health Check Path: `/api/health`.
- `GIASAT_PAIRING_CODE`: tự đặt 12–64 ký tự chữ/số, giữ riêng, dùng để mở quyền tìm kiếm. Không đưa vào Git. Mã này không phân biệt hoa/thường.
- `OPENAI_API_KEY`: không cần khi đăng nhập ChatGPT bằng mã thiết bị. Chỉ thêm nếu chủ động chọn dùng OpenAI API riêng. Nếu đã đặt biến này, xóa nó rồi deploy lại để nút đăng nhập ChatGPT được bật.
- `OPENAI_WEBSEARCH_MODEL`: `gpt-5.6-luna` cho đường ChatGPT/Codex của repo gốc (mặc định). Chỉ dùng `gpt-5-mini` nếu chọn API key. Khả năng sử dụng phụ thuộc model/tài khoản hiện có.
- `NODE_VERSION`: có thể pin `24.14.1`, là bản Node đã kiểm thử cục bộ.
- `PORT`, `RENDER`, `RENDER_EXTERNAL_URL`, `RENDER_EXTERNAL_HOSTNAME`: Render tự cung cấp; không cần nhập tay.

Sau khi deploy, mở URL Render, bấm Kết nối. Địa chỉ máy chủ là chính URL Render; mã ghép nối là giá trị GIASAT_PAIRING_CODE đã đặt. Không nhập API key trong giao diện. Bản Free phù hợp thử nghiệm; có thể ngủ khi không dùng và mất các job/phiên trong RAM khi restart. Báo cáo lưu trên trình duyệt vẫn còn. Dịch vụ OpenAI API có chi phí riêng dù hosting Render là Free.


### Đăng nhập ChatGPT ngay trên Render — không cần API key

ENV để bắt đầu (giữ mã truy cập của riêng bạn, không đưa giá trị thật lên Git):

```env
NODE_VERSION=24.14.1
GIASAT_PAIRING_CODE=<12-64-chu-khong-dau-va-so>
OPENAI_WEBSEARCH_MODEL=gpt-5.6-luna
```

1. Deploy commit mới. Không đặt `OPENAI_API_KEY` nếu dùng cách này.
2. Mở URL Render, bấm Kết nối. Bước 1: địa chỉ là chính URL Render, mã truy cập là GIASAT_PAIRING_CODE trong Environment.
3. Bước 2: bấm **Đăng nhập bằng tài khoản ChatGPT**. Máy chủ tạo mã thiết bị và trình duyệt hiển thị mã cùng nút mở `https://auth.openai.com/codex/device`.
4. Bạn tự đăng nhập và xác nhận mã trên trang OpenAI. Không nhập mật khẩu vào GiáSát và không gửi mã cho người khác. Có thể phải bật Device code login trong Settings → Security của ChatGPT; workspace có thể cần quản trị viên cho phép.
5. Quay lại GiáSát. Trạng thái chuyển sang đã có phiên; bấm Xong rồi nghiên cứu. Nếu chưa được, mã hết hạn hoặc OpenAI từ chối, giao diện báo cụ thể và cho tạo lại. Có nút Hủy khi đang chờ.

Đây là luồng device code của repo gốc được đưa lên giao diện, không phải đăng ký ứng dụng Sign in with ChatGPT mới. Khả năng đăng nhập/tìm kiếm còn phụ thuộc tài khoản, chính sách workspace và khả năng truy cập dịch vụ từ môi trường Render. Không suy ra hỗ trợ cloud chỉ từ kết quả test mock.

Phiên dùng chung cho máy chủ này: người biết mã truy cập GiáSát có thể dùng hạn mức tài khoản đã đăng nhập. Không dùng cấu hình một mã truy cập chung này làm nền tảng đăng nhập nhiều khách hàng độc lập.

Mặc định trên Render, token lưu ngoài thư mục public ở `.local/chatgpt-auth.json`, không nằm trong Git, không trả về frontend. Ghi file nguyên tử, có cache/làm mới token. Render Free không có ổ đĩa bền vững: sau ngủ/restart/deploy có thể phải nhập mã để kết nối và đăng nhập ChatGPT lại. Báo cáo lưu trên trình duyệt không bị xóa bởi việc máy chủ restart. Nếu dùng Render có persistent disk, có thể đặt `OPENAI_WEBSEARCH_AUTH_FILE=/var/data/giasat/chatgpt-auth.json` sau khi gắn disk đúng mount path; không đặt đường dẫn này trên Free khi chưa có disk.

Nút Đăng xuất chỉ xóa file phiên mà GiáSát quản lý, không thu hồi mọi phiên tài khoản trên OpenAI và không xóa auth Codex gốc trên PC. Việc hủy đăng nhập chặn kết quả đến muộn ghi đè phiên; đăng nhập thất bại giữ nguyên phiên trước đó. Trong khi có nghiên cứu chạy, máy chủ từ chối đổi/đăng xuất tài khoản để tránh xung đột.

API mới (đều cần ghép nối): `GET /api/auth/status`, `POST /api/auth/device`, `GET /api/auth/device/:id`, `DELETE /api/auth/device/:id`, `POST /api/auth/logout`. Mã thiết bị chỉ được đọc/hủy từ phiên truy cập tạo nó; endpoint không nhận token do trình duyệt nhập vào. Không log mã thiết bị hoặc nội dung token.

Tài liệu đối chiếu: https://learn.chatgpt.com/docs/auth (Headless/device code authentication).

Nếu báo có phiên đăng nhập khác đang chờ, bấm Đăng nhập lại và xác nhận hủy phiên cũ để tạo mã mới. Chỉ người đã biết mã truy cập GiáSát mới được thực hiện; mã của phiên cũ không bị tiết lộ cho phiên mới. Phiên hết hạn tự giải phóng. Kết quả xác nhận đến muộn của mã bị hủy không được lưu.

