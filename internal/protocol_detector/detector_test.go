package protocol_detector

import (
	"testing"

	"DDSUViewer/internal/serial"
	goserial "go.bug.st/serial"
)

func TestDetectProtocol_WithClosedConn(t *testing.T) {
	cfg := serial.Config{Port: "", BaudRate: 9600, DataBits: 8, StopBits: goserial.StopBits(0), Parity: goserial.Parity(0)}
	conn := serial.NewConnection(cfg)

	d := NewDetector(conn)
	proto, err := d.DetectProtocol(0x01)
	if err == nil {
		t.Fatalf("expected error for closed conn")
	}
	if proto != "Unknown" {
		t.Fatalf("expected Unknown, got %s", proto)
	}
}