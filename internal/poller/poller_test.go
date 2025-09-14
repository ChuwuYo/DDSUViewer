package poller

import (
	"testing"
	"time"

	"DDSUViewer/internal/registers"
	"DDSUViewer/internal/serial"
	goserial "go.bug.st/serial"
)

func TestStartStopPoller_NoOpenConn(t *testing.T) {
	cfg := serial.Config{Port: "", BaudRate: 9600, DataBits: 8, StopBits: goserial.StopBits(0), Parity: goserial.Parity(0)}
	conn := serial.NewConnection(cfg)
	p := NewPoller(conn, 0x01)

	if err := p.Start(); err != nil {
		t.Fatalf("Start failed: %v", err)
	}

	// 等待短时间让 goroutine 启动并尝试读取（应安全处理未打开的串口）
	time.Sleep(50 * time.Millisecond)

	if !p.IsRunning() {
		t.Fatalf("expected poller to be running")
	}

	p.Stop()
	time.Sleep(20 * time.Millisecond)

	if p.IsRunning() {
		t.Fatalf("expected poller to be stopped")
	}
}

func TestValidateDataIntegrityAndCopy(t *testing.T) {
	cfg := serial.Config{Port: "", BaudRate: 9600, DataBits: 8, StopBits: goserial.StopBits(0), Parity: goserial.Parity(0)}
	conn := serial.NewConnection(cfg)
	p := NewPoller(conn, 0x01)

	// nil 数据应返回 false
	if p.validateDataIntegrity(nil) {
		t.Fatalf("expected validateDataIntegrity(nil) == false")
	}

	// 仅有电能值且>0应视为有效
	ed := &registers.ElectricalData{ActiveEnergy: 1.23}
	if !p.validateDataIntegrity(ed) {
		t.Fatalf("expected data with ActiveEnergy>0 to be valid")
	}

	// 全部为零应被判为无效
	ed2 := &registers.ElectricalData{}
	if p.validateDataIntegrity(ed2) {
		t.Fatalf("expected empty data to be invalid")
	}

	// 测试数据拷贝
	src := &registers.ElectricalData{Voltage: 220.5, Current: 1.23, ActivePower: 270.0, Frequency: 50.0, ActiveEnergy: 12.34}
	copied := p.copyElectricalData(src)
	if copied == nil {
		t.Fatalf("copy returned nil")
	}
	if copied.Voltage != src.Voltage || copied.ActiveEnergy != src.ActiveEnergy {
		t.Fatalf("copy mismatch: got %#v want %#v", copied, src)
	}
}