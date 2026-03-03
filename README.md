# 🎯 Zplus POS - Hệ thống quản lý bán hàng toàn diện

<div align="center">

![Zplus POS](https://img.shields.io/badge/Zplus-POS-blue?style=for-the-badge)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)

</div>

## 📌 Tổng quan

**Zplus POS** là hệ thống quản lý bán hàng (Point of Sale) toàn diện dành cho cửa hàng bán lẻ, tích hợp:
- 🛒 **Quản lý bán hàng POS** - Xử lý giao dịch nhanh, hỗ trợ nhiều phương thức thanh toán
- 📦 **Quản lý hàng tồn kho** - Theo dõi real-time, cảnh báo hết hàng, kiểm kê
- 🛡️ **Quản lý bảo hành** - Theo dõi phiếu bảo hành, xử lý yêu cầu bảo hành

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go + Fiber Framework |
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS |
| **Database** | PostgreSQL 16 (primary) + MongoDB 7 (logs/metadata) |
| **Cache** | Redis 7 |
| **Message Queue** | NATS |
| **Storage** | MinIO (S3-compatible) |
| **Container** | Docker + Docker Compose |

## 📖 Documentation

| Document | Mô tả |
|----------|-------|
| [01 - Project Overview](docs/01-PROJECT-OVERVIEW.md) | Tổng quan dự án, kiến trúc, tech stack |
| [02 - Database Design](docs/02-DATABASE-DESIGN.md) | Schema PostgreSQL, MongoDB collections, Redis patterns |
| [03 - API Design](docs/03-API-DESIGN.md) | REST API endpoints, request/response format |
| [04 - Project Structure](docs/04-PROJECT-STRUCTURE.md) | Cấu trúc thư mục backend & frontend |
| [05 - Optimization Proposals](docs/05-OPTIMIZATION-PROPOSALS.md) | Đề xuất tối ưu performance, security, scaling |
| [06 - Deployment Guide](docs/06-DEPLOYMENT-GUIDE.md) | Docker, CI/CD, deployment checklist |

## 🚀 Quick Start

### Prerequisites
- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- Make

### Setup
```bash
# Clone project
git clone https://github.com/your-org/zplus-pos.git
cd zplus-pos

# Copy environment file
cp .env.example .env

# Start infrastructure
docker compose up -d

# Run migrations
make migrate-up

# Seed data
make seed

# Start backend (terminal 1)
make dev-backend

# Start frontend (terminal 2)
make dev-frontend
```

### Access
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api/v1 |
| Swagger Docs | http://localhost:8080/swagger |
| pgAdmin | http://localhost:5050 |
| Mongo Express | http://localhost:8081 |
| MinIO Console | http://localhost:9001 |
| NATS Monitor | http://localhost:8222 |

## 📁 Project Structure
```
zplus-pos/
├── backend/          # Go Fiber API server
├── frontend/         # Next.js web application
├── docs/             # Project documentation
├── migrations/       # Database migrations
├── scripts/          # Utility scripts
├── deployments/      # Docker, Nginx, monitoring configs
├── docker-compose.yml
├── Makefile
└── README.md
```

## 🔑 Key Features

### POS - Bán hàng
- ✅ Giao diện POS trực quan, tối ưu cho touch screen
- ✅ Tìm kiếm sản phẩm bằng tên, SKU, barcode
- ✅ Quét barcode bằng scanner/camera
- ✅ Hỗ trợ nhiều phương thức thanh toán (tiền mặt, thẻ, chuyển khoản, ví điện tử)
- ✅ In hóa đơn, xuất hóa đơn VAT
- ✅ Quản lý ca bán hàng (mở/đóng ca)
- ✅ Hoàn trả hàng, hủy đơn

### Inventory - Tồn kho
- ✅ Theo dõi tồn kho real-time
- ✅ Cảnh báo sắp hết hàng tự động
- ✅ Nhập hàng từ nhà cung cấp (Purchase Order)
- ✅ Chuyển kho giữa các chi nhánh
- ✅ Kiểm kê hàng hóa (Stocktake)
- ✅ Lịch sử xuất/nhập kho chi tiết
- ✅ Báo cáo giá trị tồn kho

### Warranty - Bảo hành
- ✅ Tự động tạo phiếu bảo hành khi bán hàng
- ✅ Tra cứu bảo hành (mã BH, serial, SĐT, đơn hàng)
- ✅ Tiếp nhận yêu cầu bảo hành
- ✅ Theo dõi trạng thái xử lý (nhận → kiểm tra → sửa chữa → trả)
- ✅ Lịch sử bảo hành chi tiết
- ✅ Thông báo tự động cho khách hàng
- ✅ Báo cáo bảo hành

## 📄 License

[MIT License](LICENSE)

## 👥 Team

Zplus POS Team - 2026
