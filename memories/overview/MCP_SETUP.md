# MCP Servers Setup Guide

Dự án này đã được cấu hình với 2 MCP (Model Context Protocol) servers để tăng cường khả năng của Claude Code:

## Installed MCP Servers

### 1. Serena MCP Server
**Chức năng:** Semantic code understanding và intelligent editing toolkit
- Cung cấp khả năng hiểu code ở mức semantic
- Hỗ trợ refactoring và editing thông minh
- Tích hợp Language Server Protocol (LSP)
- Thay thế miễn phí cho các công cụ như Cursor, Windsurf

**Công cụ có sẵn:**
- `mcp__serena__read_file`: Đọc file với semantic analysis
- `mcp__serena__search_symbols`: Tìm kiếm symbols trong codebase
- `mcp__serena__get_references`: Tìm tất cả references của một symbol
- `mcp__serena__get_definitions`: Tìm định nghĩa của symbols
- `mcp__serena__list_workspace_symbols`: Liệt kê tất cả symbols trong workspace

### 2. MongoDB MCP Server
**Chức năng:** Kết nối trực tiếp với MongoDB Atlas cluster
- Truy vấn database trực tiếp từ Claude Code
- Xem schema và sample data
- Thực hiện operations CRUD
- Tạo và quản lý indexes

**Kết nối:** MongoDB Atlas cluster `ev.xmouugg.mongodb.net/test`

**Công cụ có sẵn:**
- `mcp__mongodb__list_databases`: Liệt kê tất cả databases
- `mcp__mongodb__list_collections`: Liệt kê collections trong database
- `mcp__mongodb__get_schema`: Xem schema của collection
- `mcp__mongodb__find`: Truy vấn documents
- `mcp__mongodb__aggregate`: Thực hiện aggregation pipelines
- `mcp__mongodb__insert`: Thêm documents mới
- `mcp__mongodb__update`: Cập nhật documents
- `mcp__mongodb__delete`: Xóa documents
- `mcp__mongodb__create_index`: Tạo indexes

## Configuration File

File cấu hình: [.claude/mcp.json](.claude/mcp.json)

## How to Use

### Prerequisites
✅ **uv** (v0.9.5) - Đã cài đặt
✅ **npx** (v11.6.2) - Đã cài đặt

### Activation
MCP servers sẽ tự động được load khi bạn:
1. Mở dự án này trong VSCode
2. Sử dụng Claude Code extension

### Example Commands

#### Với Serena MCP:
```
Claude, hãy tìm tất cả references của function `createAppointment` trong codebase
Claude, hãy show me definition của class `AppointmentService`
Claude, hãy list tất cả symbols trong file routes/appointment.js
```

#### Với MongoDB MCP:
```
Claude, hãy show me schema của collection `appointments`
Claude, hãy query tất cả appointments có status là "Scheduled"
Claude, hãy tạo một index cho field `customerId` trong collection `appointments`
Claude, hãy show me 5 sample documents từ collection `users`
```

## Verification

Để kiểm tra MCP servers đã được load thành công:
1. Mở Claude Code trong VSCode
2. Gõ câu lệnh: "List all available MCP tools"
3. Bạn sẽ thấy các tools từ `mcp__serena__*` và `mcp__mongodb__*`

## Troubleshooting

### Serena không hoạt động
- Kiểm tra uv đã được cài đặt: `uv --version`
- Thử cài đặt Serena thủ công: `uvx --from git+https://github.com/oraios/serena serena --help`

### MongoDB MCP không hoạt động
- Kiểm tra npx đã được cài đặt: `npx --version`
- Kiểm tra connection string trong [server/.env](../server/.env)
- Thử kết nối thủ công: `npx -y @mongodb-js/mongodb-mcp-server --connection-string "..."`

## Benefits

### Development Workflow Improvements
1. **Faster Code Navigation**: Serena giúp tìm kiếm và navigate code nhanh hơn
2. **Direct Database Access**: Không cần mở MongoDB Compass hay terminal
3. **Context-Aware Assistance**: Claude hiểu cấu trúc code và database của bạn
4. **Automated Refactoring**: Serena hỗ trợ refactoring an toàn với semantic understanding

### Use Cases
- Debug appointments workflow bằng cách query database trực tiếp
- Tìm và fix bugs với symbol references
- Analyze database schema và performance
- Generate code với context từ existing codebase

## Resources

- [Serena GitHub](https://github.com/oraios/serena)
- [MongoDB MCP Server](https://github.com/mongodb-js/mongodb-mcp-server)
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)