; Quick Mirror - NSIS Custom Installer Script
; Professional installer polish

!macro customHeader
  !system "echo Quick Mirror Installer"
!macroend

!macro preInit
  SetShellVarContext all
!macroend

!macro customInit
  ; Set App User Model ID for Windows taskbar
  WriteRegStr HKCU "Software\Classes\AppID\${APP_ID}" "" "Quick Mirror"
  WriteRegStr HKCU "Software\Classes\AppID\${APP_ID}" "AppUserModelID" "com.quickmirror.app"
!macroend

!macro customInstall
  ; Create Start Menu folder with proper structure
  CreateDirectory "$SMPROGRAMS\Quick Mirror"
  CreateShortCut "$SMPROGRAMS\Quick Mirror\Quick Mirror.lnk" "$INSTDIR\Quick Mirror.exe"
  CreateShortCut "$SMPROGRAMS\Quick Mirror\Uninstall Quick Mirror.lnk" "$INSTDIR\Uninstall Quick Mirror.exe"
  
  ; Add to Windows Apps & Features with estimated size
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "EstimatedSize" "80000"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "Dhruv Chaturvedi"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "Quick Mirror"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\Quick Mirror.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$\"$INSTDIR\Uninstall Quick Mirror.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "https://github.com/dhruvcx-1/webcamquickmirror"
  
  ; Set AppUserModelID for the exe
  WriteRegStr HKCU "Software\Classes\*\shell\QuickMirror" "" "Mirror with Quick Mirror"
  WriteRegStr HKCU "Software\Classes\*\shell\QuickMirror" "Icon" "$INSTDIR\Quick Mirror.exe"
!macroend

!macro customUnInstall
  ; Remove Start Menu folder
  Delete "$SMPROGRAMS\Quick Mirror\Quick Mirror.lnk"
  Delete "$SMPROGRAMS\Quick Mirror\Uninstall Quick Mirror.lnk"
  RMDir "$SMPROGRAMS\Quick Mirror"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\Classes\AppID\${APP_ID}"
  DeleteRegKey HKCU "Software\Classes\*\shell\QuickMirror"
!macroend
