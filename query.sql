-- Tạo bảng lưu thông tin email và API key
CREATE TABLE SendEmail (
    KeyID uniqueidentifier,              -- Trường Key
    NgayTao DATETIME DEFAULT GETDATE(),  -- Ngày tạo (mặc định là ngày hiện tại)
    NguoiTao NVARCHAR(100),               -- Người tạo
    EmailGui NVARCHAR(255),          -- Email gửi
    EmailAPI NVARCHAR(255),            -- Key API
    EmailNhan NVARCHAR(255),         -- Email nhận
    EmailNhanCC NVARCHAR(255),         -- Email nhận
    EmailNhanBCC NVARCHAR(255),         -- Email nhận
    NoiDungHTML NVARCHAR(MAX),       -- Nội dung HTML
    TrangThai NVARCHAR(50)           -- Trạng thái
);
GO

-- Tạo bảng lưu thông tin File đính kèm Email
CREATE TABLE FileDinhKemEmail (
    KeyID_SendEmail uniqueidentifier,              -- Trường Key
    Đuongan NVARCHAR(MAX),       -- Đường dẫn file đính kèm
);