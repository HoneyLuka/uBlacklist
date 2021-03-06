//
//  StepItemView.swift
//  uBlacklist for Safari
//
//  Created by Selina on 29/1/2021.
//

import Cocoa

private let StepIconWidth = 35
private let StepItemCornerRadius: CGFloat = 12

class StepItemView: NSView {
    
    lazy var numImageView: NSImageView = {
        let imageView = NSImageView()
        imageView.imageScaling = .scaleProportionallyUpOrDown
        return imageView
    }()
    
    lazy var titleLabel: NSTextField = {
        let label = NSTextField(labelWithString: "")
        label.textColor = NSColor.appTextColor()
        label.font = NSFont.avenirMedium(size: MediumFontSize)
        return label
    }()
    
    lazy var descLabel: NSTextField = {
        let label = NSTextField(labelWithString: "")
        label.textColor = NSColor.appSecondaryTextColor()
        label.font = NSFont.avenirLight(size: SmallFontSize)
        label.maximumNumberOfLines = 2
        label.lineBreakMode = .byWordWrapping
        return label
    }()
    
    lazy var textStackView: NSStackView = {
        let stackView = NSStackView(views: [self.titleLabel, self.descLabel])
        stackView.orientation = .vertical
        stackView.alignment = .left
        stackView.distribution = .fill
        stackView.spacing = 5
        return stackView
    }()
    
    lazy var button: NSButton = {
        let image = NSImage(named: "btn-setting")?.tint(color: .themeColor())
        
        let button = NSButton(image: image!, target: nil, action: nil)
        button.isBordered = false
        button.imageScaling = .scaleProportionallyUpOrDown
        return button
    }()
    
    lazy var doneImageView: NSImageView = {
        let image = NSImage(named: "icon-checkmark")?.tint(color: .confirmColor())
        
        let imageView = NSImageView(image: image!)
        imageView.imageScaling = .scaleProportionallyUpOrDown
        return imageView
    }()
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        self.setupViews()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }
    
    private func setupViews() {
        self.wantsLayer = true
        self.layer?.masksToBounds = true
        self.layer?.backgroundColor = NSColor.secondaryBgColor().cgColor
        self.layer?.cornerRadius = StepItemCornerRadius
        
        self.addSubview(self.numImageView)
        self.numImageView.snp.makeConstraints { (make) in
            make.left.equalTo(ItemInset)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(StepIconWidth)
        }
        
        self.addSubview(self.doneImageView)
        self.doneImageView.snp.makeConstraints { (make) in
            make.right.equalToSuperview().offset(-ItemInset)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(StepIconWidth)
        }
        
        self.addSubview(self.button)
        self.button.snp.makeConstraints { (make) in
            make.right.equalToSuperview().offset(-ItemInset)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(StepIconWidth)
        }
        
        self.addSubview(self.textStackView)
        self.textStackView.snp.makeConstraints { (make) in
            make.left.equalTo(self.numImageView.snp.right).offset(ItemInset)
            make.centerY.equalToSuperview()
            make.right.equalTo(self.button.snp.left).offset(-ItemInset)
        }
    }
}
