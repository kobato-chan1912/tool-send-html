param (
    [string]$inputPath,
    [string]$outputPdfPath
)

# Khởi tạo COM object Word
$word = New-Object -ComObject Word.Application
$word.Visible = $false

# Mở tài liệu
$doc = $word.Documents.Open($inputPath)

$selection = $word.Selection
$selection.Find.ClearFormatting()
$selection.Find.Replacement.ClearFormatting()

$selection.Find.Forward = $true
$selection.Find.Wrap = 1         # wdFindContinue
$selection.Find.Format = $false
$selection.Find.MatchCase = $false
$selection.Find.MatchWholeWord = $false
$selection.Find.Execute([ref]$null, [ref]$null, [ref]$null, [ref]$null,
                        [ref]$null, [ref]$null, [ref]$null, [ref]$null,
                        [ref]$null, [ref]$null, [ref]2)  # wdReplaceAll = 2

# Lưu lại dưới dạng PDF
$doc.SaveAs([ref]$outputPdfPath, [ref]17)  # 17 = wdFormatPDF

# Đóng file và thoát Word
$doc.Close()
$word.Quit()
