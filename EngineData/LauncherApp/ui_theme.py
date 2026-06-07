from __future__ import annotations


def build_operator_stylesheet() -> str:
    return """
QMainWindow, QWidget#appRoot {
    background: #0E1420;
    color: #F5F7FB;
}
QWidget {
    color: #C7D1E0;
    font-size: 13px;
}
QFrame#sidebar {
    background: #111A28;
    border-right: 1px solid #23324A;
}
QFrame#settingsSidebar {
    background: #101C2A;
    border-right: 1px solid #3D5974;
}
QFrame#settingsShell {
    background: #0B1320;
    border: 1px solid #3D5974;
    border-radius: 16px;
}
QFrame#settingsContent {
    background: #0C1623;
    border-left: 1px solid #3D5974;
    border-top-right-radius: 16px;
    border-bottom-right-radius: 16px;
}
QFrame#settingsBody {
    background: #132435;
    border: 1px solid #3D5974;
    border-radius: 16px;
}
QFrame#settingsSurface {
    background: #16283B;
    border: 1px solid #4A6C9A;
    border-radius: 14px;
}
QFrame#settingsPage {
    background: #0C1522;
}
QFrame#workspace {
    background: #0E1420;
}
QFrame#topHeader {
    background: #111A28;
    border-bottom: 1px solid #23324A;
}
QFrame#panel, QFrame#menuPanel, QFrame#transcriptPanel, QFrame#settingsPanel {
    background: #1A2740;
    border: 1px solid #5A7BAA;
    border-radius: 12px;
}
QFrame#settingsSection {
    background: #1A2D43;
    border: 1px solid #4A6C9A;
    border-radius: 12px;
}
QFrame#card, QFrame#transcriptEntry, QFrame#sessionHeader {
    background: #1C2A40;
    border: 1px solid #23324A;
    border-radius: 12px;
}
QFrame#lineFrame {
    background: #152033;
    border: 1px solid #23324A;
    border-radius: 8px;
}
QFrame#lineFrame[clickable="true"]:hover {
    background: #1C2A40;
    border-color: #4DA3FF;
}
QLabel#brandTitle {
    color: #F5F7FB;
    font-size: 22px;
    font-weight: 700;
}
QLabel#brandMark {
    color: #C7D1E0;
    font-size: 12px;
    font-weight: 700;
}
QLabel#sectionLabel {
    color: #F5F7FB;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
}
QLabel#pageTitle {
    color: #F5F7FB;
    font-size: 24px;
    font-weight: 700;
}
QLabel#panelTitle {
    color: #F5F7FB;
    font-size: 20px;
    font-weight: 700;
}
QLabel#mutedText {
    color: #8B98AE;
}
QLabel#badge {
    background: #131C2B;
    border: 1px solid #23324A;
    border-radius: 8px;
    color: #F5F7FB;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#badge[statusState="ready"] {
    color: #3FB950;
    border-color: #3FB950;
}
QLabel#badge[statusState="warning"] {
    color: #D29922;
    border-color: #D29922;
}
QLabel#badge[statusState="error"] {
    color: #F85149;
    border-color: #F85149;
}
QLabel#badge[statusState="info"] {
    color: #4DA3FF;
    border-color: #2F4465;
}
QLabel#avatar {
    background: #152033;
    border: 1px solid #23324A;
    border-radius: 18px;
    color: #F5F7FB;
    font-size: 13px;
    font-weight: 700;
    min-width: 36px;
    max-width: 36px;
    min-height: 36px;
    max-height: 36px;
    qproperty-alignment: AlignCenter;
}
QLabel#lineRole {
    color: #F5F7FB;
    font-weight: 700;
    min-width: 34px;
}
QLabel#emptyState {
    color: #8B98AE;
    font-size: 14px;
    font-weight: 600;
    padding: 28px;
}
QPushButton {
    background: #131C2B;
    color: #F5F7FB;
    border: 1px solid #23324A;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 700;
}
QPushButton:hover {
    background: #1C2A40;
    border-color: #2F4465;
}
QPushButton:disabled {
    color: #8B98AE;
    background: #152033;
}
QPushButton#primaryButton {
    background: #4DA3FF;
    color: #F7FBFF;
    border-color: #4DA3FF;
    border-radius: 12px;
    min-height: 44px;
    min-width: 142px;
    font-size: 14px;
}
QPushButton#primaryButton[runState="listening"] {
    background: #2EA043;
    border-color: #3FB950;
}
QPushButton#primaryButton[runState="processing"] {
    background: #9E6A03;
    border-color: #D29922;
}
QPushButton#primaryButton[runState="error"] {
    background: #DA3633;
    border-color: #F85149;
}
QPushButton#menuButton {
    border-radius: 12px;
    min-height: 44px;
    min-width: 112px;
}
QPushButton#dangerButton {
    background: #DA3633;
    color: #F7FBFF;
    border-color: #F85149;
    border-radius: 12px;
    min-height: 44px;
    min-width: 112px;
    font-size: 14px;
}
QPushButton#dangerButton:hover {
    background: #F85149;
    border-color: #FF7B72;
}
QToolButton {
    background: transparent;
    color: #F5F7FB;
    border: none;
    padding: 0;
    font-size: 13px;
    font-weight: 700;
}
QToolButton:hover {
    color: #4DA3FF;
}
QPushButton#sidebarItem {
    text-align: left;
    min-height: 36px;
    background: #131C2B;
    border: 1px solid #2F4465;
    padding-left: 14px;
}
QPushButton#sidebarItem, QPushButton#menuButton {
    min-height: 38px;
}
QPushButton#sidebarItem[active="true"] {
    background: #1F2E46;
    border-color: #5EA8FF;
}
QPushButton#sidebarItem:hover {
    background: #1A2638;
    border-color: #5EA8FF;
}
QPushButton#settingsSidebarItem {
    text-align: left;
    min-height: 36px;
    background: #132033;
    border: 1px solid #3D5974;
    padding-left: 12px;
}
QPushButton#settingsSidebarItem, QPushButton#menuButton {
    min-height: 36px;
}
QPushButton#settingsSidebarItem[active="true"] {
    background: #1E314B;
    border-color: #5EA8FF;
}
QPushButton#settingsSidebarItem:hover {
    background: #18263B;
    border-color: #5EA8FF;
}
QScrollArea#settingsPage {
    background: #0C1522;
    border: none;
}
QScrollArea#settingsPage QWidget#qt_scrollarea_viewport {
    background: #0C1522;
}
QComboBox, QTextEdit, QPlainTextEdit {
    background: #152033;
    border: 1px solid #23324A;
    border-radius: 8px;
    padding: 7px;
    color: #F5F7FB;
}
QProgressBar {
    background: #152033;
    border: 1px solid #23324A;
    border-radius: 8px;
    color: #F5F7FB;
    text-align: center;
}
QProgressBar::chunk {
    background: #4DA3FF;
    border-radius: 8px;
}
QTabWidget::pane {
    border: 1px solid #23324A;
    border-radius: 8px;
}
QTabBar::tab {
    background: #131C2B;
    color: #C7D1E0;
    padding: 8px 10px;
    border: 1px solid #23324A;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}
QTabBar::tab:selected {
    background: #1C2A40;
    color: #F5F7FB;
}
QScrollArea {
    background: #0E1420;
    border: none;
}
QScrollBar:vertical {
    background: transparent;
    width: 10px;
}
QScrollBar::handle:vertical {
    background: #2F4465;
    border-radius: 5px;
    min-height: 20px;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0;
}
"""
