package graphql

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"DDSUViewer/internal/service"
	"context"
	"fmt"
	"strconv"
	"time"
)

type Resolver struct{
	service *service.Service
}

// NewResolver 创建新的resolver
func NewResolver(svc *service.Service) *Resolver {
	return &Resolver{
		service: svc,
	}
}

// UpdateSerialConfig is the resolver for the updateSerialConfig field.
func (r *mutationResolver) UpdateSerialConfig(ctx context.Context, input SerialConfigInput) (bool, error) {
	config := ConvertSerialConfigInput(input)
	err := r.service.UpdateSerialConfig(config)
	return err == nil, err
}

// StartPolling is the resolver for the startPolling field.
func (r *mutationResolver) StartPolling(ctx context.Context) (bool, error) {
	err := r.service.StartPolling()
	return err == nil, err
}

// StopPolling is the resolver for the stopPolling field.
func (r *mutationResolver) StopPolling(ctx context.Context) (bool, error) {
	err := r.service.StopPolling()
	return err == nil, err
}

// ElectricalData is the resolver for the electricalData field.
func (r *queryResolver) ElectricalData(ctx context.Context) (*ElectricalData, error) {
	data := r.service.GetElectricalData()
	if data == nil {
		return nil, fmt.Errorf("设备未连接或无数据")
	}
	converted := ConvertElectricalData(data)
	fmt.Printf("GraphQL返回数据: %+v\n", converted) // 调试日志
	return converted, nil
}

// DeviceStatus is the resolver for the deviceStatus field.
func (r *queryResolver) DeviceStatus(ctx context.Context) (*DeviceStatus, error) {
	status := r.service.GetDeviceStatus()
	if status == nil {
		return nil, fmt.Errorf("设备状态不可用")
	}

	errorMsg := ""
	if status.ErrorMessage != "" {
		errorMsg = status.ErrorMessage
	}

	return &DeviceStatus{
		Connected:    status.Connected,
		Protocol:     status.Protocol,
		LastUpdate:   status.LastUpdate.Format(time.RFC3339),
		ErrorMessage: &errorMsg,
	}, nil
}

// SerialConfig is the resolver for the serialConfig field.
func (r *queryResolver) SerialConfig(ctx context.Context) (*SerialConfig, error) {
	config := r.service.GetSerialConfig()
	if config == nil {
		return nil, fmt.Errorf("串口配置不可用")
	}
	return ConvertSerialConfig(config), nil
}

// AvailablePorts is the resolver for the availablePorts field.
func (r *queryResolver) AvailablePorts(ctx context.Context) ([]string, error) {
	return r.service.GetAvailablePorts()
}

// ElectricalDataStream is the resolver for the electricalDataStream field.
func (r *subscriptionResolver) ElectricalDataStream(ctx context.Context) (<-chan *ElectricalData, error) {
	subID := "data_" + strconv.FormatInt(time.Now().UnixNano(), 10)
	dataChan := r.service.Subscribe(subID)
	resultChan := make(chan *ElectricalData)

	go func() {
		defer close(resultChan)
		defer r.service.Unsubscribe(subID)

		for {
			select {
			case <-ctx.Done():
				return
			case data, ok := <-dataChan:
				if !ok {
					return
				}
				gqlData := ConvertElectricalData(data)
				if gqlData != nil {
					select {
					case resultChan <- gqlData:
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	return resultChan, nil
}

// DeviceStatusStream is the resolver for the deviceStatusStream field.
func (r *subscriptionResolver) DeviceStatusStream(ctx context.Context) (<-chan *DeviceStatus, error) {
	subID := "status_" + strconv.FormatInt(time.Now().UnixNano(), 10)
	statusChan := r.service.SubscribeStatus(subID)
	resultChan := make(chan *DeviceStatus)

	go func() {
		defer close(resultChan)
		defer r.service.Unsubscribe(subID)

		for {
			select {
			case <-ctx.Done():
				return
			case status, ok := <-statusChan:
				if !ok {
					return
				}
				errorMsg := ""
				if status.ErrorMessage != "" {
					errorMsg = status.ErrorMessage
				}
				gqlStatus := &DeviceStatus{
					Connected:    status.Connected,
					Protocol:     status.Protocol,
					LastUpdate:   status.LastUpdate.Format(time.RFC3339),
					ErrorMessage: &errorMsg,
				}
				select {
				case resultChan <- gqlStatus:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	return resultChan, nil
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

// Subscription returns SubscriptionResolver implementation.
func (r *Resolver) Subscription() SubscriptionResolver { return &subscriptionResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
type subscriptionResolver struct{ *Resolver }



// !!! WARNING !!!
// The code below was going to be deleted when updating resolvers. It has been copied here so you have
// one last chance to move it out of harms way if you want. There are two reasons this happens:
//  - When renaming or deleting a resolver the old code will be put in here. You can safely delete
//    it when you're done.
//  - You have helper methods in this file. Move them out to keep these resolver files clean.
/*
	type Resolver struct {
	service *service.Service
}
func NewResolver(svc *service.Service) *Resolver {
	return &Resolver{
		service: svc,
	}
}
*/
