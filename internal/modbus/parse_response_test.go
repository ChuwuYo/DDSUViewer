package modbus

import (
	"encoding/binary"
	"testing"
)

func buildResponse(slave byte, function byte, data []byte) []byte {
	resp := make([]byte, 0, 3+len(data)+2)
	resp = append(resp, slave)
	resp = append(resp, function)
	resp = append(resp, byte(len(data)))
	resp = append(resp, data...)
	crc := CalculateCRC16(resp[:3+len(data)])
	crcBytes := make([]byte, 2)
	binary.LittleEndian.PutUint16(crcBytes, crc)
	resp = append(resp, crcBytes...)
	return resp
}

func TestParseResponse_Valid(t *testing.T) {
	slave := byte(0x01)
	function := byte(FunctionReadHoldingRegisters)
	// 单个float32（2寄存器）示例数据：0x43 0x5C 0x80 0x00 (220.5)
	data := []byte{0x43, 0x5C, 0x80, 0x00}
	resp := buildResponse(slave, function, data)

	frame, err := ParseResponse(resp)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if frame.SlaveID != slave {
		t.Fatalf("slave mismatch: got %02X want %02X", frame.SlaveID, slave)
	}
	if frame.Function != function {
		t.Fatalf("function mismatch: got %02X want %02X", frame.Function, function)
	}
	if len(frame.Data) != len(data) {
		t.Fatalf("data length mismatch: got %d want %d", len(frame.Data), len(data))
	}
	for i := range data {
		if frame.Data[i] != data[i] {
			t.Fatalf("data byte %d mismatch: got %02X want %02X", i, frame.Data[i], data[i])
		}
	}
}

func TestParseResponse_CRCFail(t *testing.T) {
	slave := byte(0x01)
	function := byte(FunctionReadHoldingRegisters)
	data := []byte{0x43, 0x5C, 0x80, 0x00}
	resp := buildResponse(slave, function, data)
	// 损坏最后一个数据字节以令 CRC 校验失败
	resp[3] ^= 0xFF

	_, err := ParseResponse(resp)
	if err == nil {
		t.Fatalf("expected CRC error, got nil")
	}
}

func TestParseResponse_Exception(t *testing.T) {
	slave := byte(0x01)
	function := byte(FunctionReadHoldingRegisters | 0x80) // 异常响应功能码高位被置位
	excCode := byte(0x02)                                 // 任意异常码
	// 异常响应格式: Slave, Function(with 0x80), ExceptionCode, CRClo, CRChi
	resp := []byte{slave, function, excCode}
	crc := CalculateCRC16(resp[:3])
	crcBytes := make([]byte, 2)
	binary.LittleEndian.PutUint16(crcBytes, crc)
	resp = append(resp, crcBytes...)

	frame, err := ParseResponse(resp)
	if err == nil {
		t.Fatalf("expected error for exception response, got nil")
	}
	if frame == nil {
		t.Fatalf("expected non-nil frame for exception response")
	}
	if frame.Function&0x80 == 0 {
		t.Fatalf("expected exception function (MSB set), got %02X", frame.Function)
	}
	if len(frame.Data) != 1 || frame.Data[0] != excCode {
		t.Fatalf("expected exception code %02X, got %v", excCode, frame.Data)
	}
}