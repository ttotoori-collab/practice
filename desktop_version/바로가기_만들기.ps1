# ============================================================
#  손글씨 숫자 인식 앱의 바탕화면 바로가기를 만드는 스크립트.
#
#  이 스크립트가 하는 일:
#    1) 아이콘(아이콘.ico)이 없으면 아이콘_만들기.py 를 실행해 새로 만든다.
#    2) pythonw.exe 를 가리키는 바로가기를 만든다.
#       (pythonw 는 검은 콘솔 창 없이 GUI 만 띄워 주는 파이썬 실행기다)
#    3) 바로가기에 앱 식별자(AppUserModelID)를 심는다.
#       이게 있어야 작업 표시줄에 고정했을 때 제대로 동작한다.
#
#  실행 방법 (PowerShell 에서):
#      powershell -ExecutionPolicy Bypass -File .\바로가기_만들기.ps1
#
#  바탕화면에는 만들지 않고 프로젝트 폴더에만 만들고 싶으면:
#      powershell -ExecutionPolicy Bypass -File .\바로가기_만들기.ps1 -바탕화면제외
#
#  주의: 이 파일은 UTF-8(BOM 있음)로 저장해야 한다.
#        Windows PowerShell 5.1 은 BOM 이 없으면 한글을 CP949 로 잘못 읽는다.
# ============================================================

param(
    # 이 스위치를 주면 바탕화면 바로가기는 건너뛴다.
    [switch]$바탕화면제외
)

$ErrorActionPreference = "Stop"

# 이 스크립트가 들어 있는 폴더를 기준으로 경로를 잡는다.
$폴더 = Split-Path -Parent $MyInvocation.MyCommand.Path
$앱파일 = Join-Path $폴더 "app.py"
$아이콘파일 = Join-Path $폴더 "아이콘.ico"

# app.py 의 앱식별자 변수와 반드시 같은 값이어야 한다.
$앱식별자 = "DSMP.MNIST.HandwritingRecognizer"

if (-not (Test-Path $앱파일)) {
    Write-Error "app.py 를 찾을 수 없습니다: $앱파일"
    exit 1
}

# ------------------------------------------------------------
#  1단계: 파이썬 실행기 찾기
# ------------------------------------------------------------

# 진짜 pythonw.exe 인지 확인한다.
# C:\...\Microsoft\WindowsApps\ 안에 있는 것은 마이크로소프트 스토어용 '별칭 스텁'이다.
# 크기가 0바이트인 특수 파일이라 바로가기 대상으로 쓰면 제대로 동작하지 않는다.
function 쓸만한_파이썬인가 {
    param([string]$경로)
    if (-not $경로) { return $false }
    if (-not (Test-Path $경로)) { return $false }
    if ($경로 -like "*\WindowsApps\*") { return $false }
    if ((Get-Item $경로).Length -eq 0) { return $false }
    return $true
}

$파이썬w = $null

# 1순위: py 실행기(py.exe)가 알려 주는 설치 경로.
#        가장 믿을 만하다. 출력 예: " -V:3.14 *        C:\...\python.exe"
try {
    $목록 = & py.exe -0p 2>$null
    foreach ($줄 in $목록) {
        if ($줄 -match '([A-Za-z]:\\[^\r\n]*python\.exe)') {
            $후보 = Join-Path (Split-Path -Parent $Matches[1]) "pythonw.exe"
            if (쓸만한_파이썬인가 $후보) { $파이썬w = $후보; break }
        }
    }
} catch {
    # py.exe 가 없는 환경도 있으므로 조용히 넘어간다.
}

# 2순위: PATH 에 등록된 pythonw.exe / python.exe
if (-not $파이썬w) {
    foreach ($명령 in @("pythonw.exe", "python.exe")) {
        $찾은것 = Get-Command $명령 -All -ErrorAction SilentlyContinue
        foreach ($하나 in $찾은것) {
            $후보 = Join-Path (Split-Path -Parent $하나.Source) "pythonw.exe"
            if (쓸만한_파이썬인가 $후보) { $파이썬w = $후보; break }
        }
        if ($파이썬w) { break }
    }
}

if (-not $파이썬w) {
    Write-Error "쓸 수 있는 pythonw.exe 를 찾지 못했습니다. python.org 에서 받은 파이썬이 설치되어 있는지 확인해 주세요."
    exit 1
}
Write-Host "파이썬 실행기: $파이썬w"

# ------------------------------------------------------------
#  2단계: 아이콘이 없으면 만든다
# ------------------------------------------------------------

if (-not (Test-Path $아이콘파일)) {
    Write-Host "아이콘이 없어 새로 만듭니다..."
    $아이콘스크립트 = Join-Path $폴더 "아이콘_만들기.py"
    if (Test-Path $아이콘스크립트) {
        # 아이콘을 만들 때는 콘솔 출력을 봐야 하므로 python.exe 를 쓴다.
        $파이썬exe = Join-Path (Split-Path -Parent $파이썬w) "python.exe"
        & $파이썬exe $아이콘스크립트
    }
}
if (Test-Path $아이콘파일) {
    Write-Host "아이콘: $아이콘파일"
} else {
    Write-Warning "아이콘을 만들지 못했습니다. 기본 파이썬 아이콘이 사용됩니다."
    $아이콘파일 = Join-Path (Split-Path -Parent $파이썬w) "python.exe"
}

# ------------------------------------------------------------
#  3단계: 바로가기를 만드는 도우미 준비
#
#  WScript.Shell 로도 바로가기는 만들 수 있지만, 작업 표시줄 고정에
#  필요한 앱 식별자(AppUserModelID)는 심을 수 없다.
#  그래서 윈도우의 COM 인터페이스(IShellLink / IPropertyStore)를
#  직접 쓰는 작은 C# 코드를 끼워 넣는다.
# ------------------------------------------------------------

$씨샵코드 = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class 바로가기도우미
{
    // 윈도우의 셸 링크 COM 개체
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    private class CShellLink { }

    // 바로가기의 경로, 인자, 아이콘 등을 다루는 인터페이스.
    // 메서드 선언 순서가 실제 인터페이스와 정확히 같아야 한다.
    [ComImport, Guid("000214F9-0000-0000-C000-000000000046"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellLinkW
    {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszFile,
                     int cch, IntPtr pfd, uint fFlags);
        void GetIDList(out IntPtr ppidl);
        void SetIDList(IntPtr pidl);
        void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszName, int cch);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszDir, int cch);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
        void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszArgs, int cch);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
        void GetHotkey(out ushort pwHotkey);
        void SetHotkey(ushort wHotkey);
        void GetShowCmd(out int piShowCmd);
        void SetShowCmd(int iShowCmd);
        void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszIconPath,
                             int cch, out int piIcon);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, uint dwReserved);
        void Resolve(IntPtr hwnd, uint fFlags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
    }

    // 바로가기를 .lnk 파일로 저장하는 인터페이스
    [ComImport, Guid("0000010b-0000-0000-C000-000000000046"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPersistFile
    {
        void GetClassID(out Guid pClassID);
        [PreserveSig] int IsDirty();
        void Load([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, uint dwMode);
        void Save([MarshalAs(UnmanagedType.LPWStr)] string pszFileName,
                  [MarshalAs(UnmanagedType.Bool)] bool fRemember);
        void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string pszFileName);
        void GetCurFile([MarshalAs(UnmanagedType.LPWStr)] out string ppszFileName);
    }

    // 바로가기에 추가 속성(앱 식별자)을 붙이는 인터페이스
    [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore
    {
        void GetCount(out uint cProps);
        void GetAt(uint iProp, out PROPERTYKEY pkey);
        void GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
        void SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
        void Commit();
    }

    // 속성을 가리키는 열쇠 (GUID + 번호)
    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private struct PROPERTYKEY
    {
        public Guid fmtid;
        public uint pid;
    }

    // 속성 값을 담는 구조체. 64비트에서 24바이트다.
    [StructLayout(LayoutKind.Sequential)]
    private struct PROPVARIANT
    {
        public ushort vt;
        public ushort 예약1, 예약2, 예약3;
        public IntPtr 값1;
        public IntPtr 값2;
    }

    [DllImport("ole32.dll", PreserveSig = false)]
    private static extern void PropVariantClear(ref PROPVARIANT pvar);

    // 문자열 하나를 담은 속성 값을 직접 만든다.
    // propsys.dll 의 InitPropVariantFromString 은 헤더에만 있는 인라인 함수라
    // DLL 에서 찾을 수 없으므로 구조체를 손으로 채운다.
    private const ushort VT_LPWSTR = 31;

    private static PROPVARIANT 문자열속성_만들기(string 값)
    {
        PROPVARIANT 결과 = new PROPVARIANT();
        결과.vt = VT_LPWSTR;
        // COM 이 관리하는 메모리에 문자열을 복사한다.
        // 나중에 PropVariantClear 가 이 메모리를 알아서 해제한다.
        결과.값1 = Marshal.StringToCoTaskMemUni(값);
        return 결과;
    }

    public static void 만들기(string 저장경로, string 대상, string 인자,
                              string 작업폴더, string 설명,
                              string 아이콘경로, string 앱식별자)
    {
        IShellLinkW 링크 = (IShellLinkW)new CShellLink();

        링크.SetPath(대상);
        링크.SetArguments(인자);
        링크.SetWorkingDirectory(작업폴더);
        링크.SetDescription(설명);
        링크.SetIconLocation(아이콘경로, 0);

        // 앱 식별자를 심는다. 이게 있어야 작업 표시줄 고정이 제대로 동작한다.
        // PKEY_AppUserModel_ID 의 GUID 와 번호는 윈도우가 정해 놓은 값이다.
        IPropertyStore 속성저장소 = (IPropertyStore)링크;
        PROPERTYKEY 열쇠 = new PROPERTYKEY();
        열쇠.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");
        열쇠.pid = 5;

        PROPVARIANT 값 = 문자열속성_만들기(앱식별자);
        try
        {
            속성저장소.SetValue(ref 열쇠, ref 값);
            속성저장소.Commit();
        }
        finally
        {
            PropVariantClear(ref 값);
        }

        // 마지막으로 .lnk 파일로 저장한다.
        IPersistFile 파일 = (IPersistFile)링크;
        파일.Save(저장경로, true);

        Marshal.ReleaseComObject(링크);
    }
}
'@

# 같은 세션에서 두 번 불러오면 오류가 나므로, 이미 있으면 건너뛴다.
if (-not ("바로가기도우미" -as [type])) {
    Add-Type -TypeDefinition $씨샵코드 -Language CSharp
}

# ------------------------------------------------------------
#  4단계: 바로가기 만들기
# ------------------------------------------------------------

function 바로가기_만들기 {
    param([string]$저장경로)

    [바로가기도우미]::만들기(
        $저장경로,
        $파이썬w,                       # 실행할 프로그램 (콘솔 없는 파이썬)
        ('"' + $앱파일 + '"'),          # 넘겨줄 인자 (app.py 경로)
        $폴더,                          # 작업 폴더 (가중치 파일을 찾으려면 필요)
        "손글씨로 숫자를 써서 인식하는 앱",
        $아이콘파일,                    # 아이콘
        $앱식별자                       # 작업 표시줄 고정을 위한 앱 식별자
    )

    Write-Host "바로가기를 만들었습니다: $저장경로"
}

# 프로젝트 폴더 안에 하나 만든다.
바로가기_만들기 (Join-Path $폴더 "손글씨 숫자 인식기.lnk")

# 바탕화면에도 만든다. (-바탕화면제외 를 주면 건너뛴다)
if (-not $바탕화면제외) {
    $바탕화면경로 = [Environment]::GetFolderPath("Desktop")
    바로가기_만들기 (Join-Path $바탕화면경로 "손글씨 숫자 인식기.lnk")
}

Write-Host ""
Write-Host "완료! 바탕화면의 '손글씨 숫자 인식기' 를 더블클릭하면 앱이 실행됩니다."
Write-Host "작업 표시줄에 고정하려면 바로가기를 작업 표시줄로 끌어다 놓으면 됩니다."
