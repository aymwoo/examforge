# PDF图片处理功能

## 功能说明

新增了PDF转图片时的页眉页脚裁剪和图片拼接功能，可以：

1. **裁剪页眉页脚**：去除PDF每页顶部和底部的固定内容（如页眉、页脚、页码等）
2. **拼接图片**：将多页PDF转换后的图片垂直拼接成一张长图

## API参数

在 `POST /api/import/pdf` 接口中新增以下查询参数：

- `cropTop`: 裁剪顶部百分比 (0-100)，用于去除页眉
- `cropBottom`: 裁剪底部百分比 (0-100)，用于去除页脚  
- `stitchPages`: 是否拼接所有页面为一张图片 (true/false)

## 使用示例

### 1. 仅裁剪页眉页脚
```bash
curl -X POST "http://localhost:3000/api/import/pdf?cropTop=10&cropBottom=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

### 2. 裁剪并拼接
```bash
curl -X POST "http://localhost:3000/api/import/pdf?cropTop=8&cropBottom=8&stitchPages=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

### 3. 仅拼接（不裁剪）
```bash
curl -X POST "http://localhost:3000/api/import/pdf?stitchPages=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

## 处理流程

1. PDF转换为高分辨率图片 (300 DPI)
2. 如果启用裁剪：按百分比裁剪每张图片的顶部和底部
3. 如果启用拼接：将所有图片垂直拼接成一张长图
4. 将处理后的图片发送给AI进行识别

## 注意事项

- 裁剪百分比基于图片高度计算
- 拼接时会自动居中对齐不同宽度的图片
- 启用处理功能会增加一些处理时间
- 拼接后的图片可能会很长，请确保AI服务支持大尺寸图片

## 调试信息

处理过程中会在进度消息中显示：
- 是否启用了图片处理
- 是否进行了拼接
- 最终图片数量
