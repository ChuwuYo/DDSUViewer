package modbus

import (
	"encoding/binary"
	"testing"
)

func TestBuildReadFrameCRC(t *testing.T) {
	slave := byte(0x01)
	start := uint16(0x0000)
	qty := uint16(0x000A)

	frame := BuildReadFrame(slave, start, qty)
	if len(frame) != 8 {
		t.Fatalf("expected frame length 8, got %d", len(frame))
	}

	if frame[0] != slave {
		t.Errorf("slave mismatch: got %x want %x", frame[0], slave)
	}
	if frame[1] != FunctionReadHoldingRegisters {
		t.Errorf("function code mismatch: got %x want %x", frame[1], FunctionReadHoldingRegisters)
	}
	if binary.BigEndian.Uint16(frame[2:4]) != start {
		t.Errorf("start addr mismatch: got %x want %x", binary.BigEndian.Uint16(frame[2:4]), start)
	}
	if binary.BigEndian.Uint16(frame[4:6]) != qty {
		t.Errorf("quantity mismatch: got %x want %x", binary.BigEndian.Uint16(frame[4:6]), qty)
	}

	crc := CalculateCRC16(frame[:6])
	got := binary.LittleEndian.Uint16(frame[6:8])
	if crc != got {
		t.Fatalf("crc mismatch: got %x want %x", got, crc)
	}
}