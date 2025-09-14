package service

import (
	"os"
	"testing"

	goserial "go.bug.st/serial"
)

func TestSaveLoadClearSavedSerialConfig(t *testing.T) {
	// 确保测试环境干净
	_ = os.Remove("data/saved_serial_config.json")

	s := NewService()
	cfg := &SerialConfig{
		Port:     "COM_TEST",
		BaudRate: 19200,
		DataBits: 8,
		StopBits: goserial.OneStopBit,
		Parity:   goserial.NoParity,
		SlaveID:  0x01,
	}

	// 保存
	if err := s.SaveSavedSerialConfig(cfg); err != nil {
		t.Fatalf("SaveSavedSerialConfig failed: %v", err)
	}

	// 读取并验证
	loaded, err := s.LoadSavedSerialConfig()
	if err != nil {
		t.Fatalf("LoadSavedSerialConfig failed: %v", err)
	}
	if loaded == nil {
		t.Fatalf("expected loaded config, got nil")
	}
	if loaded.Port != cfg.Port {
		t.Fatalf("Port mismatch: got %s want %s", loaded.Port, cfg.Port)
	}
	if loaded.BaudRate != cfg.BaudRate {
		t.Fatalf("BaudRate mismatch: got %d want %d", loaded.BaudRate, cfg.BaudRate)
	}
	if loaded.DataBits != cfg.DataBits {
		t.Fatalf("DataBits mismatch: got %d want %d", loaded.DataBits, cfg.DataBits)
	}
	if int(loaded.StopBits) != int(cfg.StopBits) {
		t.Fatalf("StopBits mismatch: got %d want %d", int(loaded.StopBits), int(cfg.StopBits))
	}
	if int(loaded.Parity) != int(cfg.Parity) {
		t.Fatalf("Parity mismatch: got %d want %d", int(loaded.Parity), int(cfg.Parity))
	}
	if loaded.SlaveID != cfg.SlaveID {
		t.Fatalf("SlaveID mismatch: got %d want %d", loaded.SlaveID, cfg.SlaveID)
	}

	// 清除
	if err := s.ClearSavedSerialConfig(); err != nil {
		t.Fatalf("ClearSavedSerialConfig failed: %v", err)
	}

	// 再次读取应返回 nil,nil
	loaded2, err := s.LoadSavedSerialConfig()
	if err != nil {
		t.Fatalf("LoadSavedSerialConfig after clear failed: %v", err)
	}
	if loaded2 != nil {
		t.Fatalf("expected nil after clear, got %#v", loaded2)
	}

	// 清理残留文件（容错）
	_ = os.Remove("data/saved_serial_config.json")
}